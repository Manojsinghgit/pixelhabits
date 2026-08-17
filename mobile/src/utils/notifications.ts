import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDeviceToken, unregisterDeviceToken } from '../api/push';
import { Habit } from '../types';

// Maps habit id -> scheduled local notification id, so a reminder can be
// found and cancelled again when a habit's time changes or it's deleted.
const MAP_KEY = 'ph_habit_notification_ids';

// The raw FCM token last registered with the backend, so logout can
// unregister the exact same value (see registerPushToken / unregisterPushToken).
const DEVICE_TOKEN_KEY = 'ph_device_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function readMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  return current.status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function cancelHabitReminder(habitId: number): Promise<void> {
  const map = await readMap();
  const notificationId = map[habitId];
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
  delete map[habitId];
  await writeMap(map);
}

// Reschedules from scratch so edits to the reminder time always take effect.
// Local notifications are a nice-to-have (and unsupported on web, where
// scheduleNotificationAsync throws) — a failure here must never surface as
// a save error, since the habit itself was already saved successfully.
export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  try {
    await cancelHabitReminder(habit.id);
    if (!habit.reminder_time || !habit.is_active) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const [hourStr, minuteStr] = habit.reminder_time.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: habit.name,
        body: 'Time for your habit — a small step still counts.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    const map = await readMap();
    map[habit.id] = notificationId;
    await writeMap(map);
  } catch (err) {
    console.warn('scheduleHabitReminder failed (non-fatal):', err);
  }
}

// Registers this device for server-side push reminders (delivered even when
// the app is closed — see backend/habits/management/commands/send_reminders.py),
// on top of the local notifications scheduled above.
//
// FCM's v1 API (which the backend's pyfcm integration uses) needs a raw FCM
// registration token. Expo only exposes that directly on Android; iOS device
// tokens are APNs tokens that would need Firebase's native iOS SDK to bridge
// into FCM, and web has no push support at all — so this is Android-only for
// now, and is always a best-effort no-op elsewhere or on any failure (e.g. no
// Firebase config on the device), never something that should block the app.
export async function registerPushToken(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await registerDeviceToken(token, 'android');
    await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch (err) {
    console.warn('registerPushToken failed (non-fatal):', err);
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) return;
    await unregisterDeviceToken(token);
    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch (err) {
    console.warn('unregisterPushToken failed (non-fatal):', err);
  }
}

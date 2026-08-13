import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Habit } from '../types';

// Maps habit id -> scheduled local notification id, so a reminder can be
// found and cancelled again when a habit's time changes or it's deleted.
const MAP_KEY = 'ph_habit_notification_ids';

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
export async function scheduleHabitReminder(habit: Habit): Promise<void> {
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
}

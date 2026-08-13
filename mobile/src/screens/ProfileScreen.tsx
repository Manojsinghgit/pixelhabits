import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHabitsSummary } from '../api/habits';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { StatCard } from '../components/StatCard';
import { StepCountCard } from '../components/StepCountCard';
import { ProfileStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { getNotificationPermissionStatus, requestNotificationPermission } from '../utils/notifications';

interface AggregateStats {
  totalHabits: number;
  overallCompletionPct: number;
  bestCurrentStreak: number;
  longestStreakEver: number;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { username, logout } = useAuth();
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifStatus, setNotifStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, permission] = await Promise.all([
        getHabitsSummary(),
        getNotificationPermissionStatus(),
      ]);
      setStats({
        totalHabits: summary.habits.length,
        overallCompletionPct: summary.overall_completion_pct,
        bestCurrentStreak: summary.habits.reduce((max, h) => Math.max(max, h.current_streak), 0),
        longestStreakEver: summary.habits.reduce((max, h) => Math.max(max, h.longest_streak), 0),
      });
      setNotifStatus(permission);
    } catch {
      // Profile is a nice-to-have surface — silently keep last known
      // values rather than blocking the screen on a banner error.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleEnableNotifications = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED);
    setRequesting(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeInView>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.subtitle}>Keeping it consistent, one day at a time.</Text>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={60}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.sectionSpacing}>
          <StepCountCard />
        </View>
      </FadeInView>

      <FadeInView delay={110}>
        <Text style={styles.sectionTitle}>This week</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard icon="apps-outline" iconColor={colors.primary} value={stats?.totalHabits ?? 0} label="Active habits" />
              <StatCard icon="checkmark-done-outline" iconColor={colors.accent} value={`${stats?.overallCompletionPct ?? 0}%`} label="Completion" />
            </View>
            <View style={styles.statsRow}>
              <StatCard icon="flame" iconColor={colors.warning} value={stats?.bestCurrentStreak ?? 0} label="Best current streak" />
              <StatCard icon="trophy" iconColor={colors.success} value={stats?.longestStreakEver ?? 0} label="Longest streak ever" />
            </View>
          </View>
        )}
      </FadeInView>

      <FadeInView delay={160}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <View style={[styles.iconWrap, notifStatus === 'granted' ? styles.iconWrapOn : styles.iconWrapOff]}>
              <Ionicons
                name={notifStatus === 'granted' ? 'notifications' : 'notifications-off-outline'}
                size={18}
                color={notifStatus === 'granted' ? colors.success : colors.textMuted}
              />
            </View>
            <View style={styles.reminderText}>
              <Text style={styles.reminderTitle}>
                {notifStatus === 'granted' ? 'Reminders are on' : 'Reminders are off'}
              </Text>
              <Text style={styles.reminderSubtitle}>
                Each habit can have its own reminder time, set from its edit screen.
              </Text>
            </View>
          </View>
          {notifStatus !== 'granted' && (
            <Button title="Enable reminders" onPress={handleEnableNotifications} loading={requesting} variant="secondary" />
          )}
        </View>
      </FadeInView>

      <FadeInView delay={180}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate('AccountSettings')}>
          <View style={[styles.iconWrap, styles.iconWrapOff]}>
            <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.reminderText}>
            <Text style={styles.reminderTitle}>Account settings</Text>
            <Text style={styles.reminderSubtitle}>Edit email, focus area, timezone, or password.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      </FadeInView>

      <FadeInView delay={200}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Ionicons name="heart-outline" size={16} color={colors.textFaint} />
            <Text style={styles.aboutText}>PixelHabits — built to make small, steady progress feel achievable.</Text>
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={240}>
        <View style={styles.logoutWrap}>
          <Button title="Log out" variant="danger" icon="log-out-outline" onPress={handleLogout} />
        </View>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(3.5),
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  username: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing(0.25),
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(1.25),
    marginTop: spacing(1),
  },
  loader: {
    marginVertical: spacing(3),
  },
  statsGrid: {
    gap: spacing(1.5),
    marginBottom: spacing(3),
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  sectionSpacing: {
    marginBottom: spacing(3),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    gap: spacing(1.75),
    marginBottom: spacing(3),
    ...shadow.card,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    marginBottom: spacing(3),
    ...shadow.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOn: {
    backgroundColor: colors.successSoft,
  },
  iconWrapOff: {
    backgroundColor: colors.surfaceAlt,
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  reminderSubtitle: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    marginTop: spacing(0.25),
    lineHeight: 16,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1),
  },
  aboutText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  logoutWrap: {
    marginTop: spacing(1),
  },
});

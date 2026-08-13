import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { getHabit, listHabits, toggleHabitLog } from '../api/habits';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { HabitCard } from '../components/HabitCard';
import { ProgressBar } from '../components/ProgressBar';
import { StepCountCard } from '../components/StepCountCard';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, gradients, radius, shadow, spacing } from '../theme';
import { Habit } from '../types';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitList'>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function HabitListScreen({ navigation }: Props) {
  const { logout, username } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listHabits();
      setHabits(data.filter((h) => h.is_active));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = async (habit: Habit) => {
    setTogglingId(habit.id);
    // Optimistic flip so the tap feels instant; reconciled with the server
    // response right after (streak math is server-side, not guessed here).
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed_today: !h.completed_today } : h))
    );
    try {
      await toggleHabitLog(habit.id);
      const fresh = await getHabit(habit.id);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? fresh : h)));
    } catch (err) {
      // roll back the optimistic flip on failure
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, completed_today: habit.completed_today } : h))
      );
      setError(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const completedCount = useMemo(() => habits.filter((h) => h.completed_today).length, [habits]);
  const totalCount = habits.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{greeting()}{username ? `, ${username}` : ''}</Text>
          <Text style={styles.title}>{todayLabel()}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('ArchivedHabits')} hitSlop={12} style={styles.logoutButton}>
            <Ionicons name="archive-outline" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={logout} hitSlop={12} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.dashboardRow}>
        {totalCount > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Today&apos;s progress</Text>
              <Text style={styles.progressValue}>
                {completedCount}<Text style={styles.progressValueMuted}>/{totalCount}</Text>
              </Text>
            </View>
            <ProgressBar progress={progress} color={colors.accent} />
          </View>
        )}
        <View style={styles.stepCardWrap}>
          <StepCountCard />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text} />}
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 60}>
            <HabitCard
              habit={item}
              toggling={togglingId === item.id}
              onPress={() => navigation.navigate('HabitDetail', { habitId: item.id, habitName: item.name })}
              onToggleToday={() => handleToggle(item)}
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="sparkles-outline"
              title="No habits yet"
              subtitle="Start with just one — small and consistent beats big and abandoned."
            />
          ) : null
        }
      />

      <Pressable style={styles.fabWrap} onPress={() => navigation.navigate('CreateHabit')} hitSlop={8}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={28} color={colors.primaryText} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing(0.5),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginHorizontal: spacing(3),
    marginBottom: spacing(2.5),
  },
  stepCardWrap: {
    flex: 1,
  },
  progressCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    ...shadow.card,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing(1.25),
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  progressValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  progressValueMuted: {
    color: colors.textFaint,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    padding: spacing(1.5),
    borderRadius: radius.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  list: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(12),
    flexGrow: 1,
  },
  fabWrap: {
    position: 'absolute',
    right: spacing(3),
    bottom: spacing(4),
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow(colors.primary),
  },
});

import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { getHabit, getHabitLogs, toggleHabitLog } from '../api/habits';
import { Button } from '../components/Button';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import { Habit } from '../types';
import { addDays, formatDate, startOfWeekMonday } from '../utils/date';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitDetail'>;

const WEEKS_TO_SHOW = 14;

export function HabitDetailScreen({ navigation, route }: Props) {
  const { habitId, habitName } = route.params;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: habit?.name ?? habitName });
  }, [navigation, habitName, habit?.name]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = new Date();
      const start = addDays(startOfWeekMonday(today), -(WEEKS_TO_SHOW - 1) * 7);
      const [habitData, logs] = await Promise.all([
        getHabit(habitId),
        getHabitLogs(habitId, formatDate(start), formatDate(today)),
      ]);
      setHabit(habitData);
      setCompletedDates(new Set(logs.filter((l) => l.completed).map((l) => l.date)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = async () => {
    if (!habit) return;
    setToggling(true);
    try {
      await toggleHabitLog(habit.id);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  if (loading || !habit) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>
          {habit.icon} {habit.name}
        </Text>
        <Pressable onPress={() => navigation.navigate('EditHabit', { habitId: habit.id })}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🔥 {habit.current_streak}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🏆 {habit.longest_streak}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </View>
      </View>

      <Button
        title={habit.completed_today ? "Marked done today ✓" : 'Mark done for today'}
        onPress={handleToggle}
        loading={toggling}
        variant={habit.completed_today ? 'secondary' : 'primary'}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>History</Text>
      <HabitHeatmap completedDates={completedDates} color={habit.color} weeksToShow={WEEKS_TO_SHOW} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  editLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(2),
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(4),
    marginBottom: spacing(2),
  },
});

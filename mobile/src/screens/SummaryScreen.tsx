import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { getHabitsSummary } from '../api/habits';
import { colors, fontSize, radius, spacing } from '../theme';
import { HabitsSummary } from '../types';

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString(undefined, opts);
  const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString(undefined, opts);
  return `${startLabel} – ${endLabel}`;
}

export function SummaryScreen() {
  const [summary, setSummary] = useState<HabitsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getHabitsSummary();
      setSummary(data);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text} />
      }
    >
      <Text style={styles.title}>This week</Text>
      {summary ? <Text style={styles.range}>{formatRange(summary.week_start, summary.week_end)}</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {summary && (
        <>
          <View style={styles.overallCard}>
            <Text style={styles.overallValue}>{summary.overall_completion_pct}%</Text>
            <Text style={styles.overallLabel}>overall completion</Text>
          </View>

          {summary.habits.length === 0 ? (
            <Text style={styles.empty}>No active habits yet.</Text>
          ) : (
            summary.habits.map((habit) => (
              <View key={habit.id} style={styles.habitRow}>
                <View style={[styles.colorDot, { backgroundColor: habit.color }]} />
                <View style={styles.habitInfo}>
                  <Text style={styles.habitName}>
                    {habit.icon} {habit.name}
                  </Text>
                  <Text style={styles.habitMeta}>
                    🔥 {habit.current_streak} current · 🏆 {habit.longest_streak} best
                  </Text>
                </View>
                <Text style={styles.habitPct}>{habit.week_completion_pct}%</Text>
              </View>
            ))
          )}
        </>
      )}
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  range: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing(3),
  },
  error: {
    color: colors.danger,
    marginBottom: spacing(2),
  },
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing(3),
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  overallValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  overallLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing(0.5),
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(4),
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing(2),
    marginBottom: spacing(1.5),
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    marginRight: spacing(1.5),
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  habitMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing(0.25),
  },
  habitPct: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});

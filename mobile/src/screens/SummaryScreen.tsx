import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { getHabitsSummary } from '../api/habits';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { IconBadge } from '../components/IconBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ProgressRing } from '../components/ProgressRing';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { HabitsSummary } from '../types';
import { habitIconName } from '../utils/habitIcon';

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

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {summary && (
        <>
          <FadeInView>
            <View style={styles.overallCard}>
              <ProgressRing progress={summary.overall_completion_pct / 100} size={128} strokeWidth={12}>
                <Text style={styles.ringValue}>{summary.overall_completion_pct}%</Text>
              </ProgressRing>
              <Text style={styles.overallLabel}>overall completion</Text>
            </View>
          </FadeInView>

          {summary.habits.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No active habits yet"
              subtitle="Create a habit to start seeing your weekly progress here."
            />
          ) : (
            summary.habits.map((habit, index) => (
              <FadeInView key={habit.id} delay={80 + index * 60}>
                <View style={styles.habitRow}>
                  <IconBadge name={habitIconName(habit.icon)} color={habit.color} size={40} iconSize={20} />
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName} numberOfLines={1}>
                      {habit.name}
                    </Text>
                    <View style={styles.habitMetaRow}>
                      <Ionicons name="flame" size={12} color={colors.warning} />
                      <Text style={styles.habitMeta}>{habit.current_streak} current</Text>
                      <Text style={styles.habitMetaDot}>·</Text>
                      <Ionicons name="trophy" size={12} color={colors.accent} />
                      <Text style={styles.habitMeta}>{habit.longest_streak} best</Text>
                    </View>
                    <View style={styles.barWrap}>
                      <ProgressBar progress={habit.week_completion_pct / 100} color={habit.color} height={6} />
                    </View>
                  </View>
                  <Text style={styles.habitPct}>{habit.week_completion_pct}%</Text>
                </View>
              </FadeInView>
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
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  range: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing(3),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    padding: spacing(1.5),
    borderRadius: radius.md,
    marginBottom: spacing(2),
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
    marginBottom: spacing(3),
    ...shadow.card,
  },
  ringValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  overallLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing(2),
    fontWeight: fontWeight.medium,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
    marginBottom: spacing(1.5),
    gap: spacing(1.5),
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginBottom: spacing(0.5),
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginBottom: spacing(1),
  },
  habitMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  habitMetaDot: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    marginHorizontal: spacing(0.25),
  },
  barWrap: {
    marginTop: spacing(0.25),
  },
  habitPct: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

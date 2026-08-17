import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { getInsights } from '../api/gamification';
import { getHabitsSummary } from '../api/habits';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { IconBadge } from '../components/IconBadge';
import { ProgressBar } from '../components/ProgressBar';
import { ProgressRing } from '../components/ProgressRing';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { HabitsSummary, Insights } from '../types';
import { habitIconName } from '../utils/habitIcon';

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString(undefined, opts);
  const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString(undefined, opts);
  return `${startLabel} – ${endLabel}`;
}

export function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<HabitsSummary | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, insightsData] = await Promise.all([getHabitsSummary(), getInsights()]);
      setSummary(data);
      setInsights(insightsData);
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
      style={[styles.container, { paddingTop: insets.top }]}
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
            <LinearGradient
              colors={[`${colors.primary}26`, `${colors.accent}14`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.overallCard}
            >
              <ProgressRing progress={summary.overall_completion_pct / 100} size={136} strokeWidth={13}>
                <Text style={styles.ringValue}>{summary.overall_completion_pct}%</Text>
              </ProgressRing>
              <Text style={styles.overallLabel}>overall completion</Text>
            </LinearGradient>
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
                  <View style={[styles.colorBar, { backgroundColor: habit.color }]} />
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

          {insights && (insights.best_weekday || insights.most_consistent || insights.pairs.length > 0) && (
            <FadeInView delay={80 + summary.habits.length * 60}>
              <Text style={styles.insightsTitle}>Insights</Text>
              <View style={styles.insightsList}>
                {insights.trend_pct !== 0 && (
                  <View style={styles.insightRow}>
                    <View
                      style={[
                        styles.insightIconWrap,
                        { backgroundColor: insights.trend_pct > 0 ? colors.successSoft : colors.dangerSoft },
                      ]}
                    >
                      <Ionicons
                        name={insights.trend_pct > 0 ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={insights.trend_pct > 0 ? colors.success : colors.danger}
                      />
                    </View>
                    <Text style={styles.insightText}>
                      Completion is {insights.trend_pct > 0 ? 'up' : 'down'}{' '}
                      <Text style={styles.insightBold}>{Math.abs(insights.trend_pct)}%</Text> vs last week
                    </Text>
                  </View>
                )}

                {insights.best_weekday && (
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="calendar" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>{insights.best_weekday}s</Text> are your best day (
                      {insights.best_weekday_pct}% completion)
                    </Text>
                  </View>
                )}

                {insights.most_consistent && (
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: `${insights.most_consistent.color}26` }]}>
                      <Ionicons name="ribbon" size={16} color={insights.most_consistent.color} />
                    </View>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>{insights.most_consistent.name}</Text> is your most consistent
                      habit ({insights.most_consistent.pct}%, last 30 days)
                    </Text>
                  </View>
                )}

                {insights.least_consistent && (
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: colors.warningSoft }]}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                    </View>
                    <Text style={styles.insightText}>
                      <Text style={styles.insightBold}>{insights.least_consistent.name}</Text> could use attention (
                      {insights.least_consistent.pct}%, last 30 days)
                    </Text>
                  </View>
                )}

                {insights.pairs.map((pair, index) => (
                  <View key={index} style={styles.insightRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name="link" size={16} color={colors.accent} />
                    </View>
                    <Text style={styles.insightText}>
                      You're <Text style={styles.insightBold}>{pair.lift_pct}% more likely</Text> to do{' '}
                      <Text style={styles.insightBold}>{pair.habit_b}</Text> on days you do{' '}
                      <Text style={styles.insightBold}>{pair.habit_a}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </FadeInView>
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
    marginBottom: spacing(3),
    ...shadow.floating,
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
    overflow: 'hidden',
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
  insightsTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing(2),
    marginBottom: spacing(1.25),
  },
  insightsList: {
    gap: spacing(1.25),
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.75),
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  insightBold: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { getHabitsCalendar } from '../api/habits';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { FadeInView } from '../components/FadeInView';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { CalendarDay } from '../types';
import { formatDate, mondayIndexedWeekday } from '../utils/date';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function buildMonthGrid(monthDate: Date): (Date | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayIndexedWeekday(firstDay);

  const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function levelColor(pct: number): string {
  if (pct <= 0) return colors.surfaceAlt;
  if (pct < 50) return `${colors.warning}55`;
  if (pct < 100) return `${colors.accent}88`;
  return colors.success;
}

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getHabitsCalendar(monthKey(monthDate));
      setDays(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [monthDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const daysByDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const weeks = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const todayIso = formatDate(new Date());
  const selectedDay = selectedDate ? daysByDate.get(selectedDate) : undefined;
  const hasAnyData = days.some((d) => d.due > 0);

  const changeMonth = (delta: number) => {
    setSelectedDate(null);
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.monthNav}>
          <IconButton name="chevron-back" iconSize={18} size={32} style={styles.navButton} onPress={() => changeMonth(-1)} />
          <Text style={styles.monthLabel}>{monthLabel(monthDate)}</Text>
          <IconButton name="chevron-forward" iconSize={18} size={32} style={styles.navButton} onPress={() => changeMonth(1)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : !hasAnyData ? (
          <EmptyState
            icon="calendar-outline"
            title="Nothing to show yet"
            subtitle="Once you have active habits, this month's completion will show up here."
          />
        ) : (
          <FadeInView>
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((date, dayIndex) => {
                  if (!date) return <View key={dayIndex} style={styles.dayCell} />;
                  const iso = formatDate(date);
                  const day = daysByDate.get(iso);
                  const isFuture = iso > todayIso;
                  const isToday = iso === todayIso;
                  const isSelected = iso === selectedDate;
                  return (
                    <Pressable
                      key={dayIndex}
                      style={styles.dayCell}
                      disabled={isFuture || !day || day.due === 0}
                      onPress={() => setSelectedDate(isSelected ? null : iso)}
                    >
                      <View
                        style={[
                          styles.dayDot,
                          { backgroundColor: isFuture ? 'transparent' : levelColor(day?.completion_pct ?? 0) },
                          isToday && styles.dayDotToday,
                          isSelected && styles.dayDotSelected,
                        ]}
                      >
                        <Text style={[styles.dayNumber, isFuture && styles.dayNumberFuture]}>{date.getDate()}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {selectedDay && selectedDay.habits.length > 0 && (
              <View style={styles.breakdown}>
                <Text style={styles.breakdownTitle}>
                  {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                {selectedDay.habits.map((h) => (
                  <View key={h.id} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: h.color }]} />
                    <Text style={styles.breakdownName}>{h.name}</Text>
                    <Ionicons
                      name={h.completed ? 'checkmark-circle' : 'close-circle-outline'}
                      size={18}
                      color={h.completed ? colors.success : colors.textFaint}
                    />
                  </View>
                ))}
              </View>
            )}
          </FadeInView>
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
  },
  navButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  monthLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  content: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(8),
  },
  loader: {
    marginTop: spacing(6),
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing(1),
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(0.5),
  },
  dayDot: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayDotSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  dayNumber: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  dayNumberFuture: {
    color: colors.textFaint,
  },
  breakdown: {
    marginTop: spacing(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    gap: spacing(1.25),
    ...shadow.card,
  },
  breakdownTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing(0.5),
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    padding: spacing(1.5),
    borderRadius: radius.md,
    marginTop: spacing(2),
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});

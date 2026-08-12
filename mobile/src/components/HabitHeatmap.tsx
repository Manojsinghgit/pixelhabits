import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { addDays, formatDate, startOfWeekMonday } from '../utils/date';

interface HabitHeatmapProps {
  completedDates: Set<string>;
  color: string;
  weeksToShow?: number;
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const CELL_SIZE = 16;
const CELL_GAP = 4;

export function HabitHeatmap({ completedDates, color, weeksToShow = 14 }: HabitHeatmapProps) {
  const scrollRef = useRef<ScrollView>(null);

  const weeks = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeekMonday(today);
    const firstWeekStart = addDays(currentWeekStart, -(weeksToShow - 1) * 7);

    return Array.from({ length: weeksToShow }, (_, weekIndex) => {
      const weekStart = addDays(firstWeekStart, weekIndex * 7);
      return Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const iso = formatDate(date);
        return {
          iso,
          completed: completedDates.has(iso),
          isFuture: date > today,
        };
      });
    });
  }, [completedDates, weeksToShow]);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.dayLabel}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekColumn}>
                {week.map((day) => (
                  <View
                    key={day.iso}
                    style={[
                      styles.cell,
                      day.isFuture
                        ? styles.cellFuture
                        : day.completed
                          ? { backgroundColor: color }
                          : styles.cellEmpty,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  dayLabels: {
    justifyContent: 'space-between',
    marginRight: spacing(1),
    paddingVertical: 1,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
    marginBottom: CELL_GAP,
  },
  grid: {
    flexDirection: 'row',
  },
  weekColumn: {
    marginRight: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.md / 3,
    marginBottom: CELL_GAP,
  },
  cellEmpty: {
    backgroundColor: colors.surfaceAlt,
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
});

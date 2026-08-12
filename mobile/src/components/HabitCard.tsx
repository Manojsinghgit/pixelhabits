import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { Habit } from '../types';

interface HabitCardProps {
  habit: Habit;
  onPress: () => void;
  onToggleToday: () => void;
  toggling?: boolean;
}

export function HabitCard({ habit, onPress, onToggleToday, toggling }: HabitCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: habit.color }]} />
      <View style={styles.info}>
        <Text style={styles.name}>
          {habit.icon} {habit.name}
        </Text>
        <Text style={styles.streak}>
          🔥 {habit.current_streak} day{habit.current_streak === 1 ? '' : 's'}
          {habit.longest_streak > habit.current_streak ? `  ·  best ${habit.longest_streak}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={onToggleToday}
        disabled={toggling}
        hitSlop={12}
        style={[styles.checkbox, habit.completed_today && styles.checkboxDone]}
      >
        {habit.completed_today ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing(1.5),
    overflow: 'hidden',
  },
  colorBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  info: {
    flex: 1,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
  },
  name: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing(0.5),
  },
  streak: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
});

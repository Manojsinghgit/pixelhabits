import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { Habit } from '../types';
import { habitIconName } from '../utils/habitIcon';
import { IconBadge } from './IconBadge';

interface HabitCardProps {
  habit: Habit;
  onPress: () => void;
  onToggleToday: () => void;
  toggling?: boolean;
}

export function HabitCard({ habit, onPress, onToggleToday, toggling }: HabitCardProps) {
  const checkScale = useRef(new Animated.Value(habit.completed_today ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: habit.completed_today ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: habit.completed_today ? 14 : 0,
    }).start();
  }, [checkScale, habit.completed_today]);

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(cardScale, { toValue: 0.985, useNativeDriver: true, speed: 40, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()}
        style={styles.card}
      >
        <View style={[styles.colorBar, { backgroundColor: habit.color }]} />
        <IconBadge name={habitIconName(habit.icon)} color={habit.color} size={44} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={14} color={colors.warning} />
            <Text style={styles.streak}>
              {habit.current_streak} day{habit.current_streak === 1 ? '' : 's'}
            </Text>
            {habit.longest_streak > habit.current_streak ? (
              <Text style={styles.streakBest}>· best {habit.longest_streak}</Text>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onToggleToday}
          disabled={toggling}
          hitSlop={12}
          style={[styles.checkbox, habit.completed_today && { backgroundColor: habit.color, borderColor: habit.color }]}
        >
          <Animated.View
            style={{
              transform: [{ scale: checkScale }],
              opacity: checkScale,
            }}
          >
            <Ionicons name="checkmark" size={20} color={colors.background} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Animated.View>
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(2),
    gap: spacing(1.75),
    ...shadow.card,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginBottom: spacing(0.5),
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  streak: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  streakBest: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

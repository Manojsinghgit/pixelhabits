import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

interface Milestone {
  days: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MILESTONES: Milestone[] = [
  { days: 3, label: '3 days', icon: 'flash' },
  { days: 7, label: '1 week', icon: 'ribbon' },
  { days: 14, label: '2 weeks', icon: 'medal' },
  { days: 30, label: '1 month', icon: 'trophy' },
  { days: 100, label: '100 days', icon: 'star' },
];

interface MilestoneBadgesProps {
  longestStreak: number;
  color: string;
}

export function MilestoneBadges({ longestStreak, color }: MilestoneBadgesProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {MILESTONES.map((milestone) => {
        const earned = longestStreak >= milestone.days;
        return (
          <View key={milestone.days} style={styles.item}>
            <View
              style={[
                styles.badge,
                earned
                  ? { backgroundColor: `${color}26`, borderColor: color }
                  : styles.badgeLocked,
              ]}
            >
              <Ionicons
                name={earned ? milestone.icon : 'lock-closed-outline'}
                size={earned ? 20 : 16}
                color={earned ? color : colors.textFaint}
              />
            </View>
            <Text style={[styles.label, earned && { color: colors.text }]}>{milestone.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing(2),
    paddingVertical: spacing(0.5),
  },
  item: {
    alignItems: 'center',
    width: 64,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(0.75),
  },
  badgeLocked: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});

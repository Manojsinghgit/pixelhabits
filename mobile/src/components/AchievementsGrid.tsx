import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { Achievement } from '../types';

interface AchievementsGridProps {
  achievements: Achievement[];
}

export function AchievementsGrid({ achievements }: AchievementsGridProps) {
  return (
    <View style={styles.grid}>
      {achievements.map((achievement) => (
        <View key={achievement.id} style={[styles.card, achievement.earned && styles.cardEarned]}>
          <View style={[styles.iconWrap, achievement.earned && styles.iconWrapEarned]}>
            <Ionicons
              name={(achievement.earned ? achievement.icon : 'lock-closed-outline') as never}
              size={20}
              color={achievement.earned ? colors.primary : colors.textFaint}
            />
          </View>
          <Text style={[styles.label, achievement.earned && styles.labelEarned]} numberOfLines={1}>
            {achievement.label}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {achievement.description}
          </Text>
          {!achievement.earned && achievement.target > 1 && (
            <Text style={styles.progress}>
              {achievement.progress}/{achievement.target}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.5),
  },
  card: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
    alignItems: 'flex-start',
  },
  cardEarned: {
    backgroundColor: colors.primarySoft,
    borderColor: `${colors.primary}55`,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  iconWrapEarned: {
    backgroundColor: `${colors.primary}26`,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginBottom: spacing(0.25),
  },
  labelEarned: {
    color: colors.text,
  },
  description: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 13,
  },
  progress: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    marginTop: spacing(0.5),
  },
});

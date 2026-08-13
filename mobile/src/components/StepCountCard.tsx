import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStepCount } from '../hooks/useStepCount';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { ProgressBar } from './ProgressBar';

const DAILY_GOAL = 8000;

export function StepCountCard() {
  const { status, steps, isFullDay } = useStepCount();

  if (status === 'unavailable') {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="walk-outline" size={18} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Steps</Text>
        </View>
        <Text style={styles.helperText}>Step tracking isn&apos;t available on this device.</Text>
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="walk-outline" size={18} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Steps</Text>
        </View>
        <Text style={styles.helperText}>Motion & Fitness access is off — enable it in system settings to see today&apos;s steps.</Text>
      </View>
    );
  }

  const progress = Math.min(1, steps / DAILY_GOAL);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="walk" size={18} color={colors.accent} />
        </View>
        <Text style={styles.title}>{isFullDay ? "Today's steps" : 'Steps since app opened'}</Text>
      </View>

      {status === 'loading' ? (
        <Text style={styles.helperText}>Reading step data…</Text>
      ) : (
        <>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{steps.toLocaleString()}</Text>
            <Text style={styles.goal}>/ {DAILY_GOAL.toLocaleString()} goal</Text>
          </View>
          <ProgressBar progress={progress} color={colors.accent} height={6} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(1.5),
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(0.75),
    marginBottom: spacing(1.25),
  },
  value: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  goal: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
  },
  helperText: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});

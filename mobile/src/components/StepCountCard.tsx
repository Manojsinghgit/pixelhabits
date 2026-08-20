import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Text } from './Text';
import { useStepCount } from '../hooks/useStepCount';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';

const DAILY_GOAL = 8000;

function CircularProgress({ progress, size, strokeWidth, color }: { progress: number; size: number; strokeWidth: number; color: string }) {
  const center = size / 2;
  const r = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.circularIconWrap}>
        <Ionicons name="walk" size={24} color={color} />
      </View>
    </View>
  );
}

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
        <Text style={styles.helperText}>Step tracking isn't available on this device.</Text>
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
        <Text style={styles.helperText}>Motion & Fitness access is off — enable it in settings to see steps.</Text>
      </View>
    );
  }

  const progress = Math.min(1, steps / DAILY_GOAL);
  const ringSize = 70;

  return (
    <LinearGradient
      colors={[`${colors.accent}15`, `${colors.background}`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardPremium}
    >
      {status === 'loading' ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.helperText}>Syncing steps…</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          <View style={styles.textColumn}>
            <Text style={styles.title}>{isFullDay ? "Today's steps" : 'Steps today'}</Text>
            <View style={styles.valueRow}>
              <Text style={styles.value}>{steps.toLocaleString()}</Text>
            </View>
            <Text style={styles.goal}>Goal: {DAILY_GOAL.toLocaleString()}</Text>
          </View>
          
          <View style={styles.chartColumn}>
            <CircularProgress progress={progress} size={ringSize} strokeWidth={6} color={colors.accent} />
          </View>
        </View>
      )}
    </LinearGradient>
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
  cardPremium: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    padding: spacing(2.5),
    ...shadow.glow(colors.accent),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
  },
  chartColumn: {
    marginLeft: spacing(2),
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
  circularIconWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(0.5),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(0.5),
  },
  value: {
    color: colors.text,
    fontSize: 28,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
  },
  goal: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: spacing(0.5),
  },
  helperText: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  loadingWrap: {
    paddingVertical: spacing(2),
    alignItems: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

interface TimeFieldProps {
  label?: string;
  value: string; // 'HH:MM' 24-hour, or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

// Web build: the browser's own <input type="time"> gives a native clock
// picker for free, matching the OS picker used on iOS/Android (TimeField.tsx).
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        <Ionicons name="time-outline" size={18} color={value ? colors.primary : colors.textFaint} />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={webInputStyle}
        />
      </View>
    </View>
  );
}

const webInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: fontSize.md,
  color: colors.text,
  fontFamily: 'inherit',
  colorScheme: 'dark',
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(2),
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing(0.75),
    fontWeight: fontWeight.medium,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(2),
    minHeight: 52,
  },
});

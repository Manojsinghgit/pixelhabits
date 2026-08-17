import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

interface TimeFieldProps {
  label?: string;
  value: string; // 'HH:MM' 24-hour, or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

function parseTime(value: string): Date {
  const d = new Date();
  const [h, m] = value ? value.split(':').map(Number) : [9, 0];
  d.setHours(h, m, 0, 0);
  return d;
}

function formatValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplay(value: string): string {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Native (iOS/Android) reminder-time picker — swaps free-text "type 08:30"
// entry for the OS's own clock UI, so there's nothing to mistype.
export function TimeField({ label, value, onChange, placeholder = 'Add a reminder time' }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState(() => parseTime(value));

  const openPicker = () => {
    setDraft(parseTime(value));
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selected) {
        onChange(formatValue(selected));
      }
      return;
    }
    if (selected) setDraft(selected);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={openPicker}>
        <Ionicons name="time-outline" size={18} color={value ? colors.primary : colors.textFaint} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {value ? (
          <Pressable hitSlop={10} onPress={() => onChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </Pressable>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker value={draft} mode="time" display="default" onChange={handleChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
            <View style={styles.sheet}>
              <DateTimePicker value={draft} mode="time" display="spinner" onChange={handleChange} textColor={colors.text} />
              <View style={styles.sheetActions}>
                <Pressable style={styles.sheetButton} onPress={() => setShowPicker(false)}>
                  <Text style={styles.sheetButtonTextMuted}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.sheetButton}
                  onPress={() => {
                    onChange(formatValue(draft));
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.sheetButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

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
  value: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholder: {
    color: colors.textFaint,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing(1),
    paddingBottom: spacing(4),
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    marginTop: spacing(1),
  },
  sheetButton: {
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(2),
  },
  sheetButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  sheetButtonTextMuted: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});

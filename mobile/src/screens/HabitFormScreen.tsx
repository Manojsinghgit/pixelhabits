import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { createHabit, deleteHabit, getHabit, updateHabit } from '../api/habits';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import { Frequency } from '../types';

type Props = NativeStackScreenProps<HabitsStackParamList, 'CreateHabit' | 'EditHabit'>;

const ICON_OPTIONS = ['✅', '💧', '🏃', '🧘', '📖', '💊', '🦷', '🥗', '😴', '🧹', '✍️', '🚭'];
const COLOR_OPTIONS = ['#6C63FF', '#00AEEF', '#3DDC97', '#FF9F43', '#FF6B6B', '#F368E0'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function HabitFormScreen({ navigation, route }: Props) {
  const habitId = route.params && 'habitId' in route.params ? route.params.habitId : undefined;
  const isEditing = habitId !== undefined;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [reminderTime, setReminderTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  useEffect(() => {
    if (!habitId) return;
    (async () => {
      try {
        const habit = await getHabit(habitId);
        setName(habit.name);
        setIcon(habit.icon);
        setColor(habit.color);
        setFrequency(habit.frequency);
        setCustomDays(habit.custom_days);
        setReminderTime(habit.reminder_time ? habit.reminder_time.slice(0, 5) : '');
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [habitId]);

  const toggleDay = (day: number) => {
    setCustomDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleSave = async () => {
    setError(null);

    if (reminderTime && !TIME_RE.test(reminderTime)) {
      setError('Reminder time must look like "08:30" (24-hour).');
      return;
    }
    if (frequency === 'custom' && customDays.length === 0) {
      setError('Pick at least one day for a custom-days habit.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        icon,
        color,
        frequency,
        custom_days: frequency === 'custom' ? customDays : [],
        reminder_time: reminderTime ? `${reminderTime}:00` : null,
      };
      if (habitId) {
        await updateHabit(habitId, payload);
      } else {
        await createHabit(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!habitId) return;
    Alert.alert('Delete habit?', `"${name}" and its full history will be removed. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habitId);
            navigation.popToTop();
          } catch (err) {
            setError(extractErrorMessage(err));
          }
        },
      },
    ]);
  };

  if (loadingExisting) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Drink water" />

      <Text style={styles.label}>Icon</Text>
      <View style={styles.row}>
        {ICON_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setIcon(option)}
            style={[styles.iconOption, icon === option && styles.iconOptionSelected]}
          >
            <Text style={styles.iconText}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Color</Text>
      <View style={styles.row}>
        {COLOR_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setColor(option)}
            style={[
              styles.colorOption,
              { backgroundColor: option },
              color === option && styles.colorOptionSelected,
            ]}
          />
        ))}
      </View>

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setFrequency('daily')}
          style={[styles.chip, frequency === 'daily' && styles.chipSelected]}
        >
          <Text style={[styles.chipText, frequency === 'daily' && styles.chipTextSelected]}>Daily</Text>
        </Pressable>
        <Pressable
          onPress={() => setFrequency('custom')}
          style={[styles.chip, frequency === 'custom' && styles.chipSelected]}
        >
          <Text style={[styles.chipText, frequency === 'custom' && styles.chipTextSelected]}>Custom days</Text>
        </Pressable>
      </View>

      {frequency === 'custom' && (
        <>
          <Text style={styles.label}>Which days?</Text>
          <View style={styles.row}>
            {DAY_LABELS.map((label, index) => (
              <Pressable
                key={label}
                onPress={() => toggleDay(index)}
                style={[styles.chip, customDays.includes(index) && styles.chipSelected]}
              >
                <Text style={[styles.chipText, customDays.includes(index) && styles.chipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <TextField
        label="Reminder time (optional)"
        value={reminderTime}
        onChangeText={setReminderTime}
        placeholder="08:30"
        keyboardType="numbers-and-punctuation"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={isEditing ? 'Save changes' : 'Create habit'} onPress={handleSave} loading={saving} disabled={!name.trim()} />

      {isEditing && (
        <View style={styles.deleteWrap}>
          <Button title="Delete habit" variant="secondary" onPress={handleDelete} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing(1),
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(2.5),
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  iconText: {
    fontSize: 22,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  chip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.primaryText,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing(2),
    textAlign: 'center',
  },
  deleteWrap: {
    marginTop: spacing(2),
  },
});

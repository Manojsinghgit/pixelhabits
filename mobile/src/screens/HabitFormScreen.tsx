import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { createHabit, deleteHabit, getHabit, updateHabit } from '../api/habits';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { TextField } from '../components/TextField';
import { TimeField } from '../components/TimeField';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { Frequency, HabitCategory } from '../types';
import { CATEGORY_OPTIONS } from '../utils/habitCategories';
import { HABIT_ICON_OPTIONS, habitIconName } from '../utils/habitIcon';
import { HABIT_TEMPLATES } from '../utils/habitTemplates';
import { cancelHabitReminder, scheduleHabitReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<HabitsStackParamList, 'CreateHabit' | 'EditHabit'>;

const COLOR_OPTIONS = ['#7C6CFF', '#00AEEF', '#3DDC97', '#FFB84D', '#FF6B6B', '#F368E0'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HabitFormScreen({ navigation, route }: Props) {
  const habitId = route.params && 'habitId' in route.params ? route.params.habitId : undefined;
  const isEditing = habitId !== undefined;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICON_OPTIONS[0].value);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [category, setCategory] = useState<HabitCategory>('other');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [isQuantity, setIsQuantity] = useState(false);
  const [targetCount, setTargetCount] = useState('');
  const [unit, setUnit] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  useEffect(() => {
    if (!habitId) return;
    (async () => {
      try {
        const habit = await getHabit(habitId);
        setName(habit.name);
        setIcon(habit.icon);
        setColor(habit.color);
        setCategory(habit.category);
        setFrequency(habit.frequency);
        setCustomDays(habit.custom_days);
        setIsQuantity(habit.target_count !== null);
        setTargetCount(habit.target_count ? String(habit.target_count) : '');
        setUnit(habit.unit);
        setReminderTime(habit.reminder_time ? habit.reminder_time.slice(0, 5) : '');
        setIsActive(habit.is_active);
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

    if (frequency === 'custom' && customDays.length === 0) {
      setError('Pick at least one day for a custom-days habit.');
      return;
    }
    const parsedTarget = Number(targetCount);
    if (isQuantity && (!targetCount || !Number.isInteger(parsedTarget) || parsedTarget < 1)) {
      setError('Enter a target count of at least 1.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        icon,
        color,
        category,
        frequency,
        custom_days: frequency === 'custom' ? customDays : [],
        target_count: isQuantity ? parsedTarget : null,
        unit: isQuantity ? unit.trim() : '',
        reminder_time: reminderTime ? `${reminderTime}:00` : null,
      };
      const saved = habitId ? await updateHabit(habitId, payload) : await createHabit(payload);
      await scheduleHabitReminder(saved);
      navigation.goBack();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!habitId) return;
    setArchiving(true);
    try {
      const nextActive = !isActive;
      const saved = await updateHabit(habitId, { is_active: nextActive });
      if (nextActive) {
        await scheduleHabitReminder(saved);
      } else {
        await cancelHabitReminder(habitId);
      }
      navigation.goBack();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setArchiving(false);
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
            await cancelHabitReminder(habitId);
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!isEditing && (
        <FadeInView>
          <Text style={styles.label}>Quick start</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
            {HABIT_TEMPLATES.map((template) => (
              <Pressable
                key={template.name}
                onPress={() => {
                  setName(template.name);
                  setIcon(template.icon);
                  setColor(template.color);
                }}
                style={[styles.templateChip, { borderColor: `${template.color}55` }]}
              >
                <MaterialCommunityIcons name={habitIconName(template.icon)} size={16} color={template.color} />
                <Text style={styles.templateChipText}>{template.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </FadeInView>
      )}

      <FadeInView delay={20}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Drink water" />
      </FadeInView>

      <FadeInView delay={60}>
        <View style={styles.card}>
          <Text style={styles.label}>Icon</Text>
          <View style={styles.row}>
            {HABIT_ICON_OPTIONS.map((option) => {
              const selected = icon === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setIcon(option.value)}
                  style={[styles.iconOption, selected && { borderColor: color, backgroundColor: `${color}1F` }]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={selected ? color : colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, styles.labelSpaced]}>Color</Text>
          <View style={styles.row}>
            {COLOR_OPTIONS.map((option) => {
              const selected = color === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setColor(option)}
                  style={[styles.colorOption, { backgroundColor: option }]}
                >
                  {selected ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, styles.labelSpaced]}>Category</Text>
          <View style={styles.row}>
            {CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={100}>
        <View style={styles.card}>
          <Text style={styles.label}>How do you track it?</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setIsQuantity(false)}
              style={[styles.chip, !isQuantity && styles.chipSelected]}
            >
              <Text style={[styles.chipText, !isQuantity && styles.chipTextSelected]}>Yes / no</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsQuantity(true)}
              style={[styles.chip, isQuantity && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isQuantity && styles.chipTextSelected]}>Track a number</Text>
            </Pressable>
          </View>

          {isQuantity && (
            <View style={[styles.row, styles.labelSpaced]}>
              <View style={styles.quantityInput}>
                <TextField
                  label="Target"
                  value={targetCount}
                  onChangeText={setTargetCount}
                  placeholder="8"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.quantityInput}>
                <TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="glasses" />
              </View>
            </View>
          )}
        </View>
      </FadeInView>

      <FadeInView delay={120}>
        <View style={styles.card}>
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
              <Text style={[styles.label, styles.labelSpaced]}>Which days?</Text>
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
        </View>
      </FadeInView>

      <FadeInView delay={180}>
        <TimeField label="Reminder time (optional)" value={reminderTime} onChange={setReminderTime} />
      </FadeInView>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button title={isEditing ? 'Save changes' : 'Create habit'} onPress={handleSave} loading={saving} disabled={!name.trim()} />

      {isEditing && (
        <View style={styles.deleteWrap}>
          <Button
            title={isActive ? 'Archive habit' : 'Restore habit'}
            variant="secondary"
            icon={isActive ? 'archive-outline' : 'arrow-undo-outline'}
            onPress={handleArchiveToggle}
            loading={archiving}
          />
          <View style={styles.deleteWrap}>
            <Button title="Delete habit" variant="danger" icon="trash-outline" onPress={handleDelete} />
          </View>
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    marginBottom: spacing(2),
    ...shadow.card,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing(1.25),
  },
  labelSpaced: {
    marginTop: spacing(2.5),
  },
  quantityInput: {
    flex: 1,
    minWidth: 120,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1.25),
  },
  templateRow: {
    gap: spacing(1),
    paddingBottom: spacing(2),
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
  },
  templateChipText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chipTextSelected: {
    color: colors.primaryText,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    padding: spacing(1.5),
    borderRadius: radius.md,
    marginBottom: spacing(2),
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  deleteWrap: {
    marginTop: spacing(2),
  },
});

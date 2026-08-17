import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { getHabit, getHabitLogs, setHabitNote, toggleHabitLog } from '../api/habits';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { IconButton } from '../components/IconButton';
import { IconBadge } from '../components/IconBadge';
import { MilestoneBadges } from '../components/MilestoneBadges';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { TextField } from '../components/TextField';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { Habit, HabitLog } from '../types';
import { addDays, formatDate, formatTimeOfDay, startOfWeekMonday } from '../utils/date';
import { habitIconName } from '../utils/habitIcon';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitDetail'>;

const WEEKS_TO_SHOW = 14;

export function HabitDetailScreen({ navigation, route }: Props) {
  const { habitId, habitName } = route.params;
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: habit?.name ?? habitName });
  }, [navigation, habitName, habit?.name]);

  const todayIso = formatDate(new Date());
  const todayLog = useMemo(() => logs.find((l) => l.date === todayIso), [logs, todayIso]);
  const completedDates = useMemo(
    () => new Set(logs.filter((l) => l.completed).map((l) => l.date)),
    [logs]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = new Date();
      const start = addDays(startOfWeekMonday(today), -(WEEKS_TO_SHOW - 1) * 7);
      const [habitData, logsData] = await Promise.all([
        getHabit(habitId),
        getHabitLogs(habitId, formatDate(start), formatDate(today)),
      ]);
      setHabit(habitData);
      setLogs(logsData);
      setNoteDraft(logsData.find((l) => l.date === formatDate(today))?.note ?? '');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = async (delta?: number) => {
    if (!habit) return;
    setToggling(true);
    try {
      await toggleHabitLog(habit.id, undefined, habit.target_count ? delta : undefined);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const handleSaveNote = async () => {
    if (!habit) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const updated = await setHabitNote(habit.id, noteDraft.trim());
      setLogs((prev) => {
        const withoutToday = prev.filter((l) => l.date !== updated.date);
        return [updated, ...withoutToday];
      });
      setNoteSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingNote(false);
    }
  };

  const noteChanged = noteDraft.trim() !== (todayLog?.note ?? '');

  if (loading || !habit) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[`${habit.color}33`, `${habit.color}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <FadeInView>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <IconBadge name={habitIconName(habit.icon)} color={habit.color} size={52} iconSize={26} />
              <Text style={styles.name} numberOfLines={2}>
                {habit.name}
              </Text>
            </View>
            <IconButton
              name="create-outline"
              color={colors.primary}
              onPress={() => navigation.navigate('EditHabit', { habitId: habit.id })}
              style={styles.editButton}
            />
          </View>
        </FadeInView>

        <FadeInView delay={40}>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="repeat-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaChipText}>
                {habit.frequency === 'daily' ? 'Every day' : `${habit.custom_days.length} day${habit.custom_days.length === 1 ? '' : 's'}/week`}
              </Text>
            </View>
            {habit.reminder_time ? (
              <View style={styles.metaChip}>
                <Ionicons name="notifications-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaChipText}>{formatTimeOfDay(habit.reminder_time)}</Text>
              </View>
            ) : null}
          </View>
        </FadeInView>
      </LinearGradient>

      <FadeInView delay={70}>
        <View style={styles.statsRow}>
          <StatCard tint icon="flame" iconColor={colors.warning} value={habit.current_streak} label="Current streak" />
          <StatCard tint icon="trophy" iconColor={colors.accent} value={habit.longest_streak} label="Best streak" />
        </View>
      </FadeInView>

      <FadeInView delay={130}>
        {habit.target_count ? (
          <View style={styles.quantityCard}>
            <View style={styles.quantityTop}>
              <Text style={styles.quantityLabel}>Today</Text>
              <Text style={styles.quantityValue}>
                {habit.today_count}
                <Text style={styles.quantityValueMuted}>/{habit.target_count} {habit.unit}</Text>
              </Text>
            </View>
            <ProgressBar
              progress={habit.today_count / habit.target_count}
              color={habit.completed_today ? colors.success : habit.color}
              height={10}
            />
            <View style={styles.quantityActions}>
              <Pressable
                onPress={() => handleToggle(-1)}
                disabled={toggling || habit.today_count === 0}
                style={[styles.quantityButton, habit.today_count === 0 && styles.quantityButtonDisabled]}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => handleToggle(1)}
                disabled={toggling}
                style={[styles.quantityButton, { backgroundColor: habit.color }]}
              >
                <Ionicons name="add" size={20} color={colors.background} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Button
            title={habit.completed_today ? 'Marked done today' : 'Mark done for today'}
            icon={habit.completed_today ? 'checkmark-circle' : undefined}
            onPress={() => handleToggle()}
            loading={toggling}
            variant={habit.completed_today ? 'secondary' : 'primary'}
          />
        )}
      </FadeInView>

      <FadeInView delay={160}>
        <Text style={styles.sectionTitle}>Milestones</Text>
        <MilestoneBadges longestStreak={habit.longest_streak} color={habit.color} />
      </FadeInView>

      <FadeInView delay={200}>
        <Text style={styles.sectionTitle}>Today&apos;s note</Text>
        <View style={styles.noteCard}>
          <TextField
            value={noteDraft}
            onChangeText={(text) => {
              setNoteDraft(text);
              setNoteSaved(false);
            }}
            placeholder="How did it go? Anything worth remembering…"
            multiline
            numberOfLines={3}
            style={styles.noteInput}
          />
          <View style={styles.noteFooter}>
            {noteSaved && !noteChanged ? (
              <View style={styles.noteSavedRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.noteSavedText}>Saved</Text>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              onPress={handleSaveNote}
              disabled={!noteChanged || savingNote}
              style={[styles.saveNoteButton, (!noteChanged || savingNote) && styles.saveNoteButtonDisabled]}
            >
              <Text style={styles.saveNoteText}>{savingNote ? 'Saving…' : 'Save note'}</Text>
            </Pressable>
          </View>
        </View>
      </FadeInView>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FadeInView delay={190}>
        <Text style={styles.sectionTitle}>History</Text>
        <HabitHeatmap completedDates={completedDates} color={habit.color} weeksToShow={WEEKS_TO_SHOW} />
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing(3),
    paddingBottom: spacing(8),
  },
  heroBanner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.5),
    marginBottom: spacing(3),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.75),
    flexShrink: 1,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flexShrink: 1,
  },
  editButton: {
    backgroundColor: colors.primarySoft,
    borderWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  metaChipText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  quantityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
  },
  quantityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing(1.5),
  },
  quantityLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  quantityValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  quantityValueMuted: {
    color: colors.textFaint,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  quantityActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  noteSavedText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  saveNoteButton: {
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  saveNoteButtonDisabled: {
    opacity: 0.5,
  },
  saveNoteText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    padding: spacing(1.5),
    borderRadius: 12,
    marginTop: spacing(2),
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing(4),
    marginBottom: spacing(2),
  },
});

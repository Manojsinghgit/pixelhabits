import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { deleteHabit, listHabits, updateHabit } from '../api/habits';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { IconBadge } from '../components/IconBadge';
import { IconButton } from '../components/IconButton';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { Habit } from '../types';
import { habitIconName } from '../utils/habitIcon';
import { cancelHabitReminder, scheduleHabitReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<HabitsStackParamList, 'ArchivedHabits'>;

export function ArchivedHabitsScreen(_props: Props) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listHabits();
      setHabits(data.filter((h) => !h.is_active));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRestore = async (habit: Habit) => {
    setBusyId(habit.id);
    try {
      const restored = await updateHabit(habit.id, { is_active: true });
      await scheduleHabitReminder(restored);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (habit: Habit) => {
    Alert.alert('Delete habit?', `"${habit.name}" and its full history will be removed. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(habit.id);
          try {
            await deleteHabit(habit.id);
            await cancelHabitReminder(habit.id);
            setHabits((prev) => prev.filter((h) => h.id !== habit.id));
          } catch (err) {
            setError(extractErrorMessage(err));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Archived</Text>
        {habits.length > 0 ? (
          <Text style={styles.headerSubtitle}>
            {habits.length} habit{habits.length === 1 ? '' : 's'} paused, ready to pick back up anytime
          </Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 50}>
            <View style={styles.row}>
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
              <IconBadge name={habitIconName(item.icon)} color={item.color} size={40} iconSize={20} />
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <IconButton
                name="arrow-undo-outline"
                iconSize={18}
                size={36}
                color={colors.primary}
                onPress={() => handleRestore(item)}
                disabled={busyId === item.id}
                style={styles.actionButton}
              />
              <IconButton
                name="trash-outline"
                iconSize={18}
                size={36}
                color={colors.danger}
                onPress={() => handleDelete(item)}
                disabled={busyId === item.id}
                style={styles.actionButton}
              />
            </View>
          </FadeInView>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="archive-outline"
            title="No archived habits"
            subtitle="Habits you pause instead of delete will show up here."
          />
        }
      />
    </View>
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
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(1),
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  list: {
    padding: spacing(3),
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.75),
    marginBottom: spacing(1.5),
    overflow: 'hidden',
    ...shadow.card,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  actionButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing(3),
    marginTop: spacing(3),
    padding: spacing(1.5),
    borderRadius: radius.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});

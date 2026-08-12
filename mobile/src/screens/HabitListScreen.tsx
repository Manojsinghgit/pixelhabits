import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { extractErrorMessage } from '../api/errors';
import { getHabit, listHabits, toggleHabitLog } from '../api/habits';
import { useAuth } from '../auth/AuthContext';
import { HabitCard } from '../components/HabitCard';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import { Habit } from '../types';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitList'>;

export function HabitListScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listHabits();
      setHabits(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = async (habit: Habit) => {
    setTogglingId(habit.id);
    // Optimistic flip so the tap feels instant; reconciled with the server
    // response right after (streak math is server-side, not guessed here).
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed_today: !h.completed_today } : h))
    );
    try {
      await toggleHabitLog(habit.id);
      const fresh = await getHabit(habit.id);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? fresh : h)));
    } catch (err) {
      // roll back the optimistic flip on failure
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, completed_today: habit.completed_today } : h))
      );
      setError(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Pressable onPress={logout} hitSlop={12}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={habits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text} />}
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            toggling={togglingId === item.id}
            onPress={() => navigation.navigate('HabitDetail', { habitId: item.id, habitName: item.name })}
            onToggleToday={() => handleToggle(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>No habits yet. Start with just one — small is fine.</Text>
            </View>
          ) : null
        }
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate('CreateHabit')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(1),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  logout: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  error: {
    color: colors.danger,
    marginHorizontal: spacing(3),
    marginBottom: spacing(1),
  },
  list: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(12),
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing(8),
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing(1),
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing(4),
  },
  fab: {
    position: 'absolute',
    right: spacing(3),
    bottom: spacing(4),
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: colors.primaryText,
    fontSize: 32,
    fontWeight: '400',
    marginTop: -2,
  },
});

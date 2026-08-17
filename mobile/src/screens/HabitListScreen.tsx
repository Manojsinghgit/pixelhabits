import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { TextInput } from '../components/TextInput';
import { extractErrorMessage } from '../api/errors';
import { getHabit, listHabits, toggleHabitLog } from '../api/habits';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { HabitCard } from '../components/HabitCard';
import { IconButton } from '../components/IconButton';
import { ProgressBar } from '../components/ProgressBar';
import { StepCountCard } from '../components/StepCountCard';
import { HabitsStackParamList } from '../navigation/types';
import { colors, fontSize, fontWeight, gradients, radius, shadow, spacing } from '../theme';
import { Habit, HabitCategory } from '../types';
import { CATEGORY_OPTIONS } from '../utils/habitCategories';

type Props = NativeStackScreenProps<HabitsStackParamList, 'HabitList'>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function ScrollableCategoryRow({
  selected,
  onSelect,
}: {
  selected: HabitCategory | null;
  onSelect: (category: HabitCategory | null) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
      <Pressable onPress={() => onSelect(null)} style={[styles.categoryChip, !selected && styles.categoryChipSelected]}>
        <Text style={[styles.categoryChipText, !selected && styles.categoryChipTextSelected]}>All</Text>
      </Pressable>
      {CATEGORY_OPTIONS.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(isSelected ? null : option.value)}
            style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
          >
            <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function HabitListScreen({ navigation }: Props) {
  const { logout, username } = useAuth();
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listHabits();
      setHabits(data.filter((h) => h.is_active));
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

  const handleToggle = async (habit: Habit, delta?: number) => {
    setTogglingId(habit.id);
    const isQuantity = habit.target_count !== null;
    // Optimistic update so the tap feels instant; reconciled with the server
    // response right after (streak math is server-side, not guessed here).
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        if (isQuantity && h.target_count) {
          const nextCount = Math.max(0, h.today_count + (delta ?? 1));
          return { ...h, today_count: nextCount, completed_today: nextCount >= h.target_count };
        }
        return { ...h, completed_today: !h.completed_today };
      })
    );
    try {
      await toggleHabitLog(habit.id, undefined, isQuantity ? delta : undefined);
      const fresh = await getHabit(habit.id);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? fresh : h)));
    } catch (err) {
      // roll back to the pre-tap state on failure
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      setError(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const completedCount = useMemo(() => habits.filter((h) => h.completed_today).length, [habits]);
  const totalCount = habits.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const bestStreak = useMemo(() => habits.reduce((max, h) => Math.max(max, h.current_streak), 0), [habits]);

  const filteredHabits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return habits.filter(
      (h) =>
        (!selectedCategory || h.category === selectedCategory) &&
        (!query || h.name.toLowerCase().includes(query))
    );
  }, [habits, searchQuery, selectedCategory]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{greeting()}{username ? `, ${username}` : ''}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{todayLabel()}</Text>
            {bestStreak > 0 && (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={13} color={colors.warning} />
                <Text style={styles.streakChipText}>{bestStreak}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton name="archive-outline" iconSize={18} onPress={() => navigation.navigate('ArchivedHabits')} />
          <IconButton name="log-out-outline" iconSize={20} onPress={logout} />
        </View>
      </View>

      <View style={styles.dashboardRow}>
        {totalCount > 0 && (
          <LinearGradient
            colors={allDone ? [`${colors.success}29`, `${colors.success}0F`] : [`${colors.accent}22`, `${colors.primary}14`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.progressCard, allDone && shadow.glow(colors.success)]}
          >
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>{allDone ? 'All done today' : "Today's progress"}</Text>
              <Text style={styles.progressValue}>
                {completedCount}<Text style={styles.progressValueMuted}>/{totalCount}</Text>
              </Text>
            </View>
            <ProgressBar progress={progress} color={allDone ? colors.success : colors.accent} height={10} />
          </LinearGradient>
        )}
        <View style={styles.stepCardWrap}>
          <StepCountCard />
        </View>
      </View>

      {totalCount > 0 && (
        <View style={styles.filters}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textFaint} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search habits"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
            />
          </View>
          <ScrollableCategoryRow selected={selectedCategory} onSelect={setSelectedCategory} />
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredHabits}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text} />}
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 60}>
            <HabitCard
              habit={item}
              toggling={togglingId === item.id}
              onPress={() => navigation.navigate('HabitDetail', { habitId: item.id, habitName: item.name })}
              onToggleToday={(delta) => handleToggle(item, delta)}
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="sparkles-outline"
              title={totalCount > 0 ? 'No matching habits' : 'No habits yet'}
              subtitle={
                totalCount > 0
                  ? 'Try a different search or category.'
                  : 'Start with just one — small and consistent beats big and abandoned.'
              }
            />
          ) : null
        }
      />

      <Pressable style={styles.fabWrap} onPress={() => navigation.navigate('CreateHabit')} hitSlop={8}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={28} color={colors.primaryText} />
        </LinearGradient>
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing(0.5),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
  },
  streakChipText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginHorizontal: spacing(3),
    marginBottom: spacing(2.5),
  },
  stepCardWrap: {
    flex: 1,
  },
  progressCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    ...shadow.card,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing(1),
    marginBottom: spacing(1.25),
  },
  progressLabel: {
    flex: 1,
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  progressValue: {
    flexShrink: 0,
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  progressValueMuted: {
    color: colors.textFaint,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  filters: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    gap: spacing(1.25),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(1.75),
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  categoryRow: {
    gap: spacing(1),
  },
  categoryChip: {
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  categoryChipTextSelected: {
    color: colors.primaryText,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    padding: spacing(1.5),
    borderRadius: radius.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  list: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(12),
    flexGrow: 1,
  },
  fabWrap: {
    position: 'absolute',
    right: spacing(3),
    bottom: spacing(4),
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow(colors.primary),
  },
});

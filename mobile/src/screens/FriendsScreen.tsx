import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { extractErrorMessage } from '../api/errors';
import { acceptFriendRequest, getFriends, getLeaderboard, removeFriendRequest, sendFriendRequest } from '../api/friends';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { FadeInView } from '../components/FadeInView';
import { TextField } from '../components/TextField';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { FriendRequestItem, Friends, LeaderboardEntry } from '../types';

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friends | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [friendsData, leaderboardData] = await Promise.all([getFriends(), getLeaderboard()]);
      setFriends(friendsData);
      setLeaderboard(leaderboardData);
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

  const handleSend = async () => {
    if (!username.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendFriendRequest(username.trim());
      setUsername('');
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (req: FriendRequestItem) => {
    setBusyId(req.id);
    try {
      await acceptFriendRequest(req.id);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setBusyId(id);
    try {
      await removeFriendRequest(id);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const incoming = friends?.requests.filter((r) => r.direction === 'incoming') ?? [];
  const outgoing = friends?.requests.filter((r) => r.direction === 'outgoing') ?? [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FadeInView>
        <View style={styles.addCard}>
          <TextField
            label="Add a friend"
            value={username}
            onChangeText={setUsername}
            placeholder="Their username"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!username.trim() || sending}
            style={[styles.sendButton, (!username.trim() || sending) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>{sending ? 'Sending…' : 'Send request'}</Text>
          </Pressable>
        </View>
      </FadeInView>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {incoming.length > 0 && (
        <FadeInView delay={40}>
          <Text style={styles.sectionTitle}>Requests</Text>
          {incoming.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Text style={styles.requestName}>{req.username}</Text>
              <View style={styles.requestActions}>
                <IconButton
                  name="checkmark"
                  iconSize={18}
                  size={32}
                  color={colors.success}
                  onPress={() => handleAccept(req)}
                  disabled={busyId === req.id}
                  style={[styles.iconButton, styles.iconButtonAccept]}
                />
                <IconButton
                  name="close"
                  iconSize={18}
                  size={32}
                  color={colors.danger}
                  onPress={() => handleRemove(req.id)}
                  disabled={busyId === req.id}
                  style={styles.iconButton}
                />
              </View>
            </View>
          ))}
        </FadeInView>
      )}

      {outgoing.length > 0 && (
        <FadeInView delay={60}>
          <Text style={styles.sectionTitle}>Sent</Text>
          {outgoing.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Text style={styles.requestName}>{req.username}</Text>
              <Text style={styles.pendingLabel}>Pending</Text>
              <IconButton
                name="close"
                iconSize={18}
                size={32}
                color={colors.textFaint}
                onPress={() => handleRemove(req.id)}
                disabled={busyId === req.id}
                style={styles.iconButton}
              />
            </View>
          ))}
        </FadeInView>
      )}

      <FadeInView delay={90}>
        <Text style={styles.sectionTitle}>This week's leaderboard</Text>
        {leaderboard.length <= 1 && !friends?.friends.length ? (
          <EmptyState
            icon="people-outline"
            title="No friends yet"
            subtitle="Add a friend by username to compare streaks and completion."
          />
        ) : (
          leaderboard.map((entry, index) => (
            <View key={entry.username} style={[styles.leaderRow, entry.is_you && styles.leaderRowYou]}>
              <Text style={styles.leaderRank}>{index + 1}</Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>
                  {entry.username}
                  {entry.is_you ? ' (you)' : ''}
                </Text>
                <Text style={styles.leaderMeta}>
                  Lv {entry.level} · 🔥 {entry.best_current_streak} day{entry.best_current_streak === 1 ? '' : 's'}
                </Text>
              </View>
              <Text style={styles.leaderPct}>{entry.week_completion_pct}%</Text>
            </View>
          ))
        )}
      </FadeInView>

      {friends && friends.friends.length > 0 && (
        <FadeInView delay={120}>
          <Text style={styles.sectionTitle}>Friends</Text>
          {friends.friends.map((friend) => (
            <View key={friend.id} style={styles.requestRow}>
              <Text style={styles.requestName}>{friend.username}</Text>
              <IconButton
                name="person-remove-outline"
                iconSize={16}
                size={32}
                color={colors.textFaint}
                onPress={() => handleRemove(friend.id)}
                disabled={busyId === friend.id}
                style={styles.iconButton}
              />
            </View>
          ))}
        </FadeInView>
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
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    marginBottom: spacing(2),
    ...shadow.card,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing(1.5),
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.primaryText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(1.25),
    marginTop: spacing(1),
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.5),
    marginBottom: spacing(1),
  },
  requestName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  pendingLabel: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  iconButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0,
  },
  iconButtonAccept: {
    backgroundColor: colors.successSoft,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(1.75),
    marginBottom: spacing(1),
  },
  leaderRowYou: {
    borderColor: `${colors.primary}66`,
    backgroundColor: colors.primarySoft,
  },
  leaderRank: {
    width: 20,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  leaderMeta: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
    marginTop: spacing(0.25),
  },
  leaderPct: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
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
});

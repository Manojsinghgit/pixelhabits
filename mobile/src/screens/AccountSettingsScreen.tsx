import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { changePassword, getMe, updateMe } from '../api/account';
import { extractErrorMessage } from '../api/errors';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { TextField } from '../components/TextField';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { Niche } from '../types';

const NICHE_OPTIONS: { value: Niche; label: string }[] = [
  { value: 'adhd', label: 'ADHD' },
  { value: 'anxiety', label: 'Anxiety / overwhelm' },
  { value: 'general', label: 'General focus-challenged' },
  { value: 'other', label: 'Other' },
];

export function AccountSettingsScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [niche, setNiche] = useState<Niche>('adhd');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      setUsername(me.username);
      setEmail(me.email);
      setNiche(me.niche);
      setTimezone(me.timezone);
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateMe({ email: email.trim(), niche, timezone: timezone.trim() });
      setProfileSaved(true);
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordChanged(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordChanged(true);
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeInView>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <TextField label="Username" value={username} editable={false} style={styles.readOnlyInput} />
          <TextField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setProfileSaved(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={styles.label}>What best describes you?</Text>
          <View style={styles.chipRow}>
            {NICHE_OPTIONS.map((option) => {
              const selected = option.value === niche;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setNiche(option.value);
                    setProfileSaved(false);
                  }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Timezone"
            value={timezone}
            onChangeText={(text) => {
              setTimezone(text);
              setProfileSaved(false);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. Asia/Kolkata"
          />

          {profileError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{profileError}</Text>
            </View>
          ) : null}

          <Button
            title={profileSaved ? 'Saved' : 'Save changes'}
            icon={profileSaved ? 'checkmark-circle' : undefined}
            onPress={handleSaveProfile}
            loading={savingProfile}
            variant={profileSaved ? 'secondary' : 'primary'}
          />
        </View>
      </FadeInView>

      <FadeInView delay={80}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <View style={styles.card}>
          <TextField
            label="Current password"
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
          />
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextField
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {passwordError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{passwordError}</Text>
            </View>
          ) : null}
          {passwordChanged ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.successText}>Password updated.</Text>
            </View>
          ) : null}

          <Button
            title="Update password"
            onPress={handleChangePassword}
            loading={changingPassword}
            disabled={!oldPassword || !newPassword || !confirmPassword}
          />
        </View>
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
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(1.25),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2.25),
    marginBottom: spacing(3),
    ...shadow.card,
  },
  readOnlyInput: {
    opacity: 0.6,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing(1),
    fontWeight: fontWeight.medium,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
    marginBottom: spacing(2.5),
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.successSoft,
    padding: spacing(1.5),
    borderRadius: radius.md,
    marginBottom: spacing(2),
  },
  successText: {
    color: colors.success,
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
});

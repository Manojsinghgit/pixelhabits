import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fontSize, fontWeight, gradients, radius, shadow, spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const inactive = disabled || loading;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  const textColor = isDanger ? colors.danger : isSecondary ? colors.primary : colors.primaryText;

  const content = loading ? (
    <ActivityIndicator color={isSecondary ? colors.primary : colors.primaryText} />
  ) : (
    <View style={styles.contentRow}>
      {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
      <Text
        style={[
          styles.text,
          isSecondary && styles.secondaryText,
          isDanger && styles.dangerText,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={inactive}>
      <Animated.View style={[{ transform: [{ scale }] }, inactive && styles.disabled]}>
        {isSecondary || isDanger ? (
          <Animated.View style={[styles.base, isDanger ? styles.dangerBase : styles.secondaryBase]}>
            {content}
          </Animated.View>
        ) : (
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, styles.primaryBase]}
          >
            {content}
          </LinearGradient>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing(1.75),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52, // generous tap target — small targets are disproportionately
    // frustrating for users with motor/attention difficulty landing a tap.
  },
  primaryBase: {
    ...shadow.glow(colors.primary),
  },
  secondaryBase: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dangerBase: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.primaryText,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  secondaryText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.danger,
  },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number;
}

// Small circular icon buttons (archive, edit, accept/decline, nav arrows…)
// had zero tap feedback on any platform before this. Gives Android its
// native ripple and iOS/web a dimmed-on-press state, from one place.
export function IconButton({
  name,
  onPress,
  size = 40,
  iconSize,
  color = colors.textMuted,
  style,
  disabled,
  hitSlop = 8,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      android_ripple={{ color: colors.borderLight, radius: size / 2 }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize ?? Math.round(size * 0.45)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../theme';

interface IconBadgeProps {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  size?: number;
  iconSize?: number;
  set?: 'community' | 'ionicons';
}

// Soft-tinted circular badge behind an icon glyph — used anywhere a habit's
// color needs to read as a shape, not just raw emoji text.
export function IconBadge({ name, color, size = 44, iconSize, set = 'community' }: IconBadgeProps) {
  const glyphSize = iconSize ?? Math.round(size * 0.5);
  const IconComponent = set === 'ionicons' ? Ionicons : MaterialCommunityIcons;
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}26`,
        },
      ]}
    >
      <IconComponent name={name as never} size={glyphSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});

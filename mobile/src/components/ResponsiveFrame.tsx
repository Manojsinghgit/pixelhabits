import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, radius, shadow } from '../theme';

// This app is designed as a single-column phone layout and locked to
// portrait (see app.json), so a phone is never wider than ~430pt. Above
// that, we're either on wide desktop web or a tablet (iPad, Android
// tablet) — either way, stretching the phone UI edge to edge looks broken
// (huge cards, awkward line lengths), so we center it in a fixed-width
// column instead, like a device frame. Below the threshold this is a
// no-op passthrough on every platform.
const MAX_WIDTH = 480;

export function ResponsiveFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  if (width <= MAX_WIDTH) {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    // Only ever applied when Platform.OS === 'web' (see Platform.select
    // above) — '100vh' isn't a valid native DimensionValue, hence the cast.
    // @ts-expect-error web-only CSS unit, harmless no-op on native
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    // @ts-expect-error web-only CSS unit, harmless no-op on native
    maxHeight: Platform.OS === 'web' ? '100vh' : undefined,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    ...shadow.floating,
    overflow: 'hidden',
    borderRadius: radius.sm,
  },
});

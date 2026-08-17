import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { fontFamily } from '../theme';

// Swap-in replacement for RN's Text that applies the app-wide monospace
// font by default — import this instead of Text from 'react-native'.
export function Text({ style, ...props }: TextProps) {
  return <RNText style={[{ fontFamily }, style]} {...props} />;
}

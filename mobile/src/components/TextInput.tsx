import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { fontFamily } from '../theme';

// Swap-in replacement for RN's TextInput that applies the app-wide
// monospace font by default — import this instead of TextInput from
// 'react-native'.
export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput style={[{ fontFamily }, style]} {...props} />;
}

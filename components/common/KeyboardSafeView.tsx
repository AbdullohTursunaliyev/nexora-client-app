import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** keyboardVerticalOffset — usually the height of any sticky header. */
  offset?: number;
}

/**
 * Drop-in flex container that lifts content above the iOS keyboard.
 *
 * Use this whenever a screen has a TextInput AND a bottom-anchored UI
 * (chat input row, sticky CTA bar). Without it, iOS slides the keyboard
 * over the input — the user types blind. Android's manifest defaults to
 * `adjustResize` so the visual problem is iOS-specific, but using this
 * everywhere keeps the behaviour consistent across platforms.
 *
 * For form-style screens (long ScrollView of inputs) prefer
 * `KeyboardScroll` which combines this with a ScrollView.
 */
export default function KeyboardSafeView({ children, style, offset = 0 }: Props) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

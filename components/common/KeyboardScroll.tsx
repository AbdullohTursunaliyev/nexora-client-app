import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface Props {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomOffset?: number;
}

/**
 * Klaviatura ochilganda inputlar yopilib qolmasligi uchun
 * KeyboardAvoidingView + ScrollView orqali umumiy wrapper.
 */
export default function KeyboardScroll({ children, contentContainerStyle, bottomOffset = 0 }: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={bottomOffset}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

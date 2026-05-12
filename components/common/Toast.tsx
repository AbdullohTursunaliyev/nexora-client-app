import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (text: string, variant?: ToastVariant) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const COLORS: Record<ToastVariant, { border: string; iconBg: string; iconColor: string; icon: string }> = {
  success: {
    border: 'rgba(34, 197, 94, 0.5)',
    iconBg: 'rgba(34, 197, 94, 0.18)',
    iconColor: '#22C55E',
    icon: '✓',
  },
  error: {
    border: 'rgba(239, 68, 68, 0.5)',
    iconBg: 'rgba(239, 68, 68, 0.18)',
    iconColor: '#EF4444',
    icon: '✕',
  },
  info: {
    border: 'rgba(0, 207, 255, 0.5)',
    iconBg: 'rgba(0, 207, 255, 0.18)',
    iconColor: '#00CFFF',
    icon: 'ⓘ',
  },
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const counter = useRef(0);
  // Track outstanding dismiss timers per toast id so we can clear them
  // when the provider unmounts. Pre-fix (FE-H13) the setTimeout leaked
  // and could fire `setMessages` on an unmounted provider, producing
  // "can't update state on unmounted component" warnings + the timer
  // itself was never collectable.
  const timeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const show = useCallback(
    (text: string, variant: ToastVariant = 'info') => {
      const id = ++counter.current;
      setMessages((prev) => [...prev, { id, text, variant }]);
      const handle = setTimeout(() => dismiss(id), 3000);
      timeoutsRef.current.set(id, handle);
    },
    [dismiss],
  );

  // Cleanup on unmount: cancel every still-pending dismiss timer.
  useEffect(() => {
    const map = timeoutsRef.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  // Memoise the context value so consumers using `useToast()` don't see
  // reference churn on every parent render.
  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (t) => show(t, 'success'),
      error: (t) => show(t, 'error'),
      info: (t) => show(t, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.container, { top: insets.top + 12 }]}>
        {messages.map((m) => (
          <ToastItem key={m.id} message={m} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ message }: { message: ToastMessage }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const c = COLORS[message.variant];

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderColor: c.border, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.iconBg }]}>
        <Text style={[styles.icon, { color: c.iconColor }]}>{c.icon}</Text>
      </View>
      <Text style={styles.text}>{message.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  // No iOS shadow / Android elevation. The 1.5pt coloured border on
  // success/error variants is enough to anchor the toast over the
  // content beneath; shadows read as a halo on OLED.
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A2030',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontFamily: Fonts.inter.bold,
    fontSize: 13,
  },
  text: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    flex: 1,
  },
});

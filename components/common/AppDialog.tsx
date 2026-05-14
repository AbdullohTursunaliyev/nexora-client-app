import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

/**
 * Dialog system that replaces every native `Alert.alert()` call.
 *
 * Why we built this:
 *   The OS-rendered Alert.alert dialogs (and the system permission
 *   prompts they look like — see the Expo "needs permissions" toast)
 *   ignore our dark theme entirely; on Android they render as a small
 *   white card with stock blue buttons, on iOS as a translucent grey
 *   one. That clash is jarring and makes the app feel like a wrapper
 *   instead of a native experience. AppDialog renders fully inside our
 *   design tokens (Inter/SemiBold, Colors.background, pill buttons,
 *   gradient primary) so confirmation dialogs match the rest of the
 *   product.
 *
 * What it can't do:
 *   The real OS *permission* prompt (Android `requestPermissionsAsync`,
 *   iOS Keychain unlock, etc.) is rendered by the OS itself — those
 *   we can't restyle. The pattern we use everywhere is: show an
 *   AppDialog with the *rationale* first, then call the OS API after
 *   the user taps "Allow". The OS prompt is then short-lived and
 *   contextualised by our pre-prompt screen.
 *
 * Usage:
 *   const dialog = useDialog();
 *
 *   const ok = await dialog.confirm({
 *     title: t.bookingExit.title,
 *     message: t.bookingExit.message,
 *     confirmLabel: t.common.confirm,
 *     cancelLabel: t.common.cancel,
 *     destructive: true,
 *   });
 *   if (ok) router.back();
 *
 *   await dialog.alert({ title: 'Done', message: 'Saved.' });
 *
 * Promise-based — calls return when the user dismisses, so the awaiting
 * code can decide what to do without prop-drilling state. Backdrop tap
 * and Android hardware back are treated as cancel.
 */

export type DialogVariant = 'info' | 'success' | 'warning' | 'destructive';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the primary button uses the danger gradient. */
  destructive?: boolean;
  variant?: DialogVariant;
}

interface AlertOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  variant?: DialogVariant;
}

interface DialogState extends ConfirmOptions {
  /** True for confirm (two buttons), false for alert (single OK). */
  hasCancel: boolean;
  resolve: (ok: boolean) => void;
}

interface DialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside AppDialogProvider');
  return ctx;
}

const VARIANT_ICON: Record<DialogVariant, { glyph: string; color: string; bg: string }> = {
  info: { glyph: 'ⓘ', color: '#00CFFF', bg: 'rgba(0, 207, 255, 0.18)' },
  success: { glyph: '✓', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.18)' },
  warning: { glyph: '!', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.18)' },
  destructive: { glyph: '!', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.18)' },
};

export default function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const close = useCallback((ok: boolean) => {
    setState((prev) => {
      if (prev) prev.resolve(ok);
      return null;
    });
  }, []);

  // Android hardware back = cancel. Without this the back press would
  // dismiss the entire screen behind the modal which is surprising.
  useEffect(() => {
    if (!state) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(false);
      return true;
    });
    return () => sub.remove();
  }, [state, close]);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, hasCancel: true, resolve });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOptions): Promise<void> =>
      new Promise<void>((resolve) => {
        setState({
          ...opts,
          hasCancel: false,
          resolve: () => resolve(),
        });
      }),
    [],
  );

  const value = useMemo<DialogContextValue>(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogShell state={state} onClose={close} />
    </DialogContext.Provider>
  );
}

function DialogShell({
  state,
  onClose,
}: {
  state: DialogState | null;
  onClose: (ok: boolean) => void;
}) {
  // Read translations *here* (inside the dialog shell) rather than
  // relying on caller-provided labels. Otherwise a caller that
  // forgets `confirmLabel` falls back to a hardcoded 'OK' / 'Bekor
  // qilish' string and the dialog mixes the user's locale with stale
  // English/Uzbek copy. Pulling from useT() means the fallback
  // tracks whichever language the user picked in Settings.
  const t = useT();
  const visible = state !== null;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
    }
  }, [visible, opacity, scale]);

  if (!state) return null;

  const variant = state.variant ?? (state.destructive ? 'destructive' : 'info');
  const icon = VARIANT_ICON[variant];
  const isDestructive = state.destructive || variant === 'destructive';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onClose(false)} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
            <Text style={[styles.iconGlyph, { color: icon.color }]}>{icon.glyph}</Text>
          </View>
          <Text style={styles.title}>{state.title}</Text>
          {!!state.message && <Text style={styles.message}>{state.message}</Text>}

          {/* Dialog button row — pre-fix used the shared <Button />
              at size="md" for both halves. Inline so dialog button
              proportions can be tuned for the modal-card layout
              specifically (44pt height, equal-flex pair, dialog-
              specific padding) without dragging the rest of the
              app. Cancel = solid cyan secondary; Confirm = gradient
              primary (or red-gradient danger when isDestructive). */}
          <View style={[styles.buttonRow, !state.hasCancel && styles.buttonRowSingle]}>
            {state.hasCancel && (
              <View style={styles.btnFlex}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onClose(false)}
                  accessibilityRole="button"
                  accessibilityLabel={state.cancelLabel ?? t.common.cancel}
                  style={dialogCancelBtnStyles.btn}
                >
                  <Text
                    style={dialogCancelBtnStyles.label}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {state.cancelLabel ?? t.common.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.btnFlex}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onClose(true)}
                accessibilityRole="button"
                accessibilityLabel={state.confirmLabel ?? t.common.ok}
                style={dialogConfirmBtnStyles.btn}
              >
                <LinearGradient
                  colors={
                    isDestructive
                      ? ['#EF4444', '#DC2626']
                      : ['#3B5BF5', '#8B3DF5']
                  }
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={dialogConfirmBtnStyles.fill}
                >
                  <Text
                    style={dialogConfirmBtnStyles.label}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {state.confirmLabel ?? t.common.ok}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // No iOS shadow / Android elevation. The Modal backdrop overlay
  // (rgba 0.6) already separates the dialog from the underlying
  // content; the 1pt border softens the card edge over the dark slab
  // without needing the elevation-24 glow halo it used to ship with.
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#141823',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconGlyph: {
    fontFamily: Fonts.inter.bold,
    fontSize: 26,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#8B95A8',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  buttonRowSingle: {
    paddingHorizontal: 0,
  },
  btnFlex: {
    flex: 1,
  },
});

const dialogCancelBtnStyles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: 999,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
  },
});

const dialogConfirmBtnStyles = StyleSheet.create({
  btn: { height: 44, borderRadius: 999, overflow: 'hidden' },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
  },
});

// Importing LinearGradient pre-emptively; if the danger variant ever
// needs a gradient ring this hook will be in place. Currently unused.
void LinearGradient;

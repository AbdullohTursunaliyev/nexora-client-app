import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useAuth } from '../store/AuthProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT, useLocale } from '../lib/i18n/LocaleProvider';
import { LOCALE_NATIVE_LABEL, type Locale } from '../lib/i18n/translations';
import { needsRegistration as didNeedRegistration } from '../lib/api/services/phoneAuth';

type Phase = 'phone' | 'code' | 'register';

/**
 * Seconds the user must wait before the "Resend code" link becomes
 * tappable. Shorter than the server-side OTP TTL (5 min) on purpose
 * — the code stays valid longer, but the resend button should feel
 * available quickly so a user who never received the SMS isn't
 * stuck. 60s is the friendliest cadence the banking apps in this
 * region settled on.
 */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Phone + 4-digit OTP login.
 *
 * Replaces the old login+password screen. The flow is three phases
 * surfaced as transitions on a single screen (no separate routes —
 * the state and back navigation read naturally as one ladder):
 *
 *   phone     → enter phone number, tap "Send code"
 *   code      → enter the 4-digit OTP returned by the BE; while the
 *               SMS gateway is still pending the response carries
 *               `dev_code` and we surface it inline in a "Dev kod"
 *               pill so the operator team can complete the loop
 *   register  → only reached when verify-code returns
 *               `needs_registration: true`; user enters their name
 *               and the backend issues a fresh account
 *
 * Auto-submit: the code phase fires verify the moment 4 digits are
 * present so the user doesn't have to tap "Sign in" after iOS's SMS
 * auto-fill pastes the OTP in. A `verifying` guard prevents the
 * effect from re-firing while the request is in flight.
 *
 * Phone normalisation here mirrors the server — strip non-digits,
 * if the result is 9 digits starting with 9 prepend "998" (bare
 * Uzbek mobile). The server runs the same canonicalisation so it's
 * safe to send either form, but we normalise locally to render the
 * pretty "+998 90 123 45 67" subtitle on the code phase.
 */
export default function LoginScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLocale();
  const { requestPhoneCode, verifyPhoneCode, registerWithPhone } = useAuth();

  const [phase, setPhase] = useState<Phase>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  // Hidden input ref for the code phase — taps on the visual 4-box
  // grid call .focus() to bring up the keyboard, matching the
  // affordance every modern OTP screen uses.
  const codeInputRef = useRef<TextInput>(null);
  // One-shot guard for the verify call. The `submitting` state flag
  // alone isn't enough: between the auto-submit effect firing on
  // the fourth digit and a near-simultaneous button tap, two calls
  // can interleave before React schedules the `setSubmitting(true)`
  // update. The OTP burns on the first verify (used_at = now), so
  // the second hits "expired" and shows a misleading error toast
  // *after* the success toast + navigation. Tracking the in-flight
  // state in a ref makes the guard synchronous.
  const verifyInFlightRef = useRef(false);

  const normalisedPhone = useMemo(() => normalisePhone(phoneInput), [phoneInput]);
  const prettyPhone = useMemo(() => prettifyPhone(normalisedPhone), [normalisedPhone]);

  const onSendCode = useCallback(async () => {
    if (!isValidUzPhone(normalisedPhone)) {
      toast.error(t.login.errorPhone);
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestPhoneCode(normalisedPhone);
      setDevCode(res.dev_code ?? null);
      // FE-side resend cooldown is shorter than the OTP TTL — the
      // code itself stays valid for 5 min server-side, but we don't
      // want the user mashing "resend" every couple of seconds. 60s
      // matches the friendliest cadence most banking apps use.
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
      setCode('');
      // Fresh OTP issued — clear the one-shot verify guard so the
      // new code can be submitted (handles the resend path too).
      verifyInFlightRef.current = false;
      setPhase('code');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [normalisedPhone, requestPhoneCode, t, toast]);

  const onVerifyCode = useCallback(async () => {
    if (code.length !== 4) {
      toast.error(t.login.errorCode);
      return;
    }
    // Synchronous one-shot guard — see verifyInFlightRef docblock.
    // The `submitting` state flag still drives the spinner UI; the
    // ref just makes the "is a request already running?" check
    // race-free.
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await verifyPhoneCode(normalisedPhone, code);
      if (didNeedRegistration(res)) {
        setSignupToken(res.signup_token);
        setPhase('register');
      } else {
        toast.success(t.login.welcomeToast);
        router.replace('/(tabs)');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
      // Clear the code so the user can retype without backspacing
      // four times. Pre-fix users would type a wrong digit, see the
      // error toast, then have to tap delete repeatedly before
      // retrying. Wiping the field also re-enables the auto-submit
      // effect (which is gated on full-length input).
      setCode('');
      // Allow retries — release the one-shot guard so the next
      // attempt (after the user re-enters the code) goes through.
      verifyInFlightRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [code, normalisedPhone, t, toast, verifyPhoneCode]);

  const onFinishRegister = useCallback(async () => {
    if (firstName.trim().length < 2) {
      toast.error(t.login.errorFirstName);
      return;
    }
    if (!signupToken) {
      // Defensive — we should always have a signup_token when on
      // this phase, but if state was somehow lost (deep link?) send
      // the user back to phone entry instead of crashing.
      setPhase('phone');
      return;
    }
    setSubmitting(true);
    try {
      await registerWithPhone(
        signupToken,
        firstName.trim(),
        lastName.trim() || null,
      );
      toast.success(t.login.registeredToast);
      router.replace('/(tabs)');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [firstName, lastName, registerWithPhone, signupToken, t, toast]);

  // Resend countdown — ticks the displayed timer down once per
  // second so the user sees a precise countdown ("Resend in 0:42")
  // instead of a generic "wait a bit". Stops at zero so the resend
  // button becomes tappable.
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setInterval(() => {
      setResendCountdown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);

  // Auto-submit on full code entry. The `submitting` guard prevents
  // a re-fire while the previous verify is still in flight (rare
  // but a network hiccup + RN re-render could trigger it without).
  useEffect(() => {
    if (phase !== 'code') return;
    if (code.length !== 4) return;
    if (submitting) return;
    void onVerifyCode();
    // We intentionally omit `onVerifyCode` from the deps — its
    // identity changes on every render because of `code` in its
    // closure, and including it would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, phase, submitting]);

  // Fade between phases. Cheap fade + slight slide so the user
  // perceives forward motion through the steps rather than the
  // whole screen flicker-replacing itself.
  //
  // The Animated.Value defaults to 1 (fully visible) so the very
  // first render — typically right after logout / fresh app launch
  // — paints with the card already on screen. Without this the
  // user saw a blank card slot for ~240ms on every cold mount,
  // which read as "the screen is broken" in field reports.
  // The mount-phase guard below skips the animate-in pass on first
  // render and only fades when the phase actually transitions.
  const phaseAnim = useRef(new Animated.Value(1)).current;
  const isFirstPhaseRender = useRef(true);
  useEffect(() => {
    if (isFirstPhaseRender.current) {
      isFirstPhaseRender.current = false;
      return;
    }
    phaseAnim.setValue(0);
    Animated.timing(phaseAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phase, phaseAnim]);
  const phaseStyle = {
    opacity: phaseAnim,
    transform: [
      {
        translateY: phaseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const onChangePhone = useCallback(() => {
    setPhase('phone');
    setCode('');
    setDevCode(null);
    setResendCountdown(0);
    // Reset the one-shot verify guard so a fresh phone + code cycle
    // isn't blocked by the previous attempt's ref state.
    verifyInFlightRef.current = false;
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.flex}>
          {/* Brand block */}
          <View style={styles.brand}>
            <LinearGradient
              colors={['#00CFFF', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoDot}
            />
            <Text style={styles.brandTitle}>{t.login.brandTitle}</Text>
            <Text style={styles.brandSubtitle}>{t.login.brandSubtitle}</Text>
          </View>

          <Animated.View style={[styles.card, phaseStyle]}>
            {phase === 'phone' && (
              <PhoneStep
                t={t}
                value={phoneInput}
                onChange={setPhoneInput}
                onSubmit={onSendCode}
                submitting={submitting}
              />
            )}
            {phase === 'code' && (
              <CodeStep
                t={t}
                code={code}
                onChange={(next) => setCode(next.replace(/\D/g, '').slice(0, 4))}
                onSubmit={onVerifyCode}
                onChangePhone={onChangePhone}
                onResend={onSendCode}
                resendCountdown={resendCountdown}
                devCode={devCode}
                prettyPhone={prettyPhone}
                submitting={submitting}
                inputRef={codeInputRef}
              />
            )}
            {phase === 'register' && (
              <RegisterStep
                t={t}
                firstName={firstName}
                lastName={lastName}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onSubmit={onFinishRegister}
                submitting={submitting}
              />
            )}
          </Animated.View>

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={styles.langChip}
              onPress={() => setLangModalOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.langChipText}>
                {LOCALE_NATIVE_LABEL[locale]} ▾
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <LanguageModal
        visible={langModalOpen}
        currentLocale={locale}
        onClose={() => setLangModalOpen(false)}
        onPick={(next) => {
          setLocale(next);
          setLangModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Phase: phone entry
// ──────────────────────────────────────────────────────────────────

interface PhoneStepProps {
  t: ReturnType<typeof useT>;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function PhoneStep({ t, value, onChange, onSubmit, submitting }: PhoneStepProps) {
  // "Looks like a 9-digit local mobile" gate. Same shape the BE
  // expects, just enough to disable the CTA while the input is
  // empty or obviously short — keeps the user from tapping Send on
  // an empty field and getting a needless error toast.
  const digits = value.replace(/\D/g, '');
  const ready = digits.length >= 9;

  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{t.login.phoneStepTitle}</Text>
      <Text style={styles.stepSubtitle}>{t.login.phoneStepSubtitle}</Text>

      <View style={styles.phoneRow}>
        <View style={styles.phonePrefix}>
          <Text style={styles.phonePrefixText}>{t.login.phoneCountryPrefix}</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          value={value}
          onChangeText={onChange}
          placeholder={t.login.phonePlaceholder}
          placeholderTextColor="#5A6A85"
          keyboardType="phone-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={ready ? onSubmit : undefined}
          maxLength={20}
        />
      </View>

      <PrimaryButton
        label={t.login.sendCodeBtn}
        loadingLabel={t.login.sendingCodeLabel}
        loading={submitting}
        disabled={!ready}
        onPress={onSubmit}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Phase: 4-digit OTP entry
// ──────────────────────────────────────────────────────────────────

interface CodeStepProps {
  t: ReturnType<typeof useT>;
  code: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onChangePhone: () => void;
  onResend: () => void;
  resendCountdown: number;
  devCode: string | null;
  prettyPhone: string;
  submitting: boolean;
  inputRef: React.RefObject<TextInput | null>;
}

function CodeStep({
  t,
  code,
  onChange,
  onSubmit,
  onChangePhone,
  onResend,
  resendCountdown,
  devCode,
  prettyPhone,
  submitting,
  inputRef,
}: CodeStepProps) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{t.login.codeStepTitle}</Text>
      <Text style={styles.stepSubtitle}>
        {t.login.codeStepSubtitle.replace('{phone}', prettyPhone)}
      </Text>

      {/* Visual 4-box grid. Each box reads from a slice of the
          underlying hidden input's value, so the OS keyboard (and
          iOS SMS auto-fill via textContentType="oneTimeCode") just
          works without wiring per-box focus. */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.codeBoxRow}
        accessibilityRole="button"
        accessibilityLabel={t.login.codeStepTitle}
      >
        {[0, 1, 2, 3].map((i) => {
          const digit = code[i] ?? '';
          const isCursor = code.length === i;
          return (
            <View
              key={i}
              style={[
                styles.codeBox,
                digit !== '' && styles.codeBoxFilled,
                isCursor && styles.codeBoxActive,
              ]}
            >
              <Text style={styles.codeBoxDigit}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
        // iOS auto-fills SMS-delivered codes when this is set.
        textContentType="oneTimeCode"
        // The visual representation lives in the boxes above; the
        // real input is rendered offscreen so taps + the keyboard
        // route through here without users seeing a duplicate.
        style={styles.hiddenInput}
        caretHidden
      />

      {devCode ? (
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>
            {t.login.devCodeLabel.replace('{code}', devCode)}
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        label={t.login.verifyBtn}
        loadingLabel={t.login.checkingLabel}
        loading={submitting}
        onPress={onSubmit}
      />

      <View style={styles.codeFooter}>
        {resendCountdown > 0 ? (
          <Text style={styles.resendCountdown}>
            {t.login.resendIn.replace('{seconds}', formatCountdown(resendCountdown))}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={onResend}
            disabled={submitting}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.resendNow}>{t.login.resendNow}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onChangePhone}
          disabled={submitting}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.changePhone}>{t.login.changePhone}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Phase: name collection (new accounts only)
// ──────────────────────────────────────────────────────────────────

interface RegisterStepProps {
  t: ReturnType<typeof useT>;
  firstName: string;
  lastName: string;
  onFirstNameChange: (next: string) => void;
  onLastNameChange: (next: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

function RegisterStep({
  t,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onSubmit,
  submitting,
}: RegisterStepProps) {
  return (
    <View style={styles.stepBody}>
      <Text style={styles.stepTitle}>{t.login.registerStepTitle}</Text>
      <Text style={styles.stepSubtitle}>{t.login.registerStepSubtitle}</Text>

      <TextInput
        style={styles.textInput}
        value={firstName}
        onChangeText={onFirstNameChange}
        placeholder={t.login.firstNamePlaceholder}
        placeholderTextColor="#5A6A85"
        autoFocus
        autoCapitalize="words"
        maxLength={64}
        returnKeyType="next"
      />
      <View style={styles.inputGap} />
      <TextInput
        style={styles.textInput}
        value={lastName}
        onChangeText={onLastNameChange}
        placeholder={t.login.lastNamePlaceholder}
        placeholderTextColor="#5A6A85"
        autoCapitalize="words"
        maxLength={64}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton
        label={t.login.finishRegisterBtn}
        loadingLabel={t.login.checkingLabel}
        loading={submitting}
        onPress={onSubmit}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Primary CTA — inline so the gradient styling stays specific to
//  this screen without dragging the shared <Button>'s flat preset.
// ──────────────────────────────────────────────────────────────────

interface PrimaryButtonProps {
  label: string;
  loadingLabel: string;
  loading: boolean;
  /**
   * When true, the button visually dims and refuses taps. We surface
   * this on the phone step until the input has 9+ digits so the user
   * can't fire an empty submit (would produce a noisy error toast for
   * no information value).
   */
  disabled?: boolean;
  onPress: () => void;
}

function PrimaryButton({ label, loadingLabel, loading, disabled, onPress }: PrimaryButtonProps) {
  const inert = loading || disabled;
  return (
    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={inert}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={
          disabled ? ['#2A3142', '#2A3142'] : ['#00CFFF', '#7C3AED']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryBtnFill}
      >
        {loading ? (
          <View style={styles.primaryBtnLoadingRow}>
            <ActivityIndicator color="#0B0F16" size="small" />
            <Text style={styles.primaryBtnText}>{loadingLabel}</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.primaryBtnText,
              disabled && styles.primaryBtnTextMuted,
            ]}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Language picker bottom sheet (unchanged from prior login screen)
// ──────────────────────────────────────────────────────────────────

interface LanguageModalProps {
  visible: boolean;
  currentLocale: Locale;
  onClose: () => void;
  onPick: (locale: Locale) => void;
}

function LanguageModal({ visible, currentLocale, onClose, onPick }: LanguageModalProps) {
  const insets = useSafeAreaInsets();
  const locales: Locale[] = ['uz', 'ru', 'en'];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHandle} />
          {locales.map((loc) => {
            const active = loc === currentLocale;
            return (
              <TouchableOpacity
                key={loc}
                style={[styles.modalRow, active && styles.modalRowActive]}
                onPress={() => onPick(loc)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.modalRowText, active && styles.modalRowTextActive]}>
                  {LOCALE_NATIVE_LABEL[loc]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Phone normalisation + display helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Canonicalise a user-typed phone to digits-only E.164-ish form,
 * matching the server-side PhoneOtpService::normalize. Worth running
 * here too so the UI subtitle can render the pretty form without
 * waiting on a round-trip.
 */
function normalisePhone(input: string): string {
  const digits = input.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    return '998' + digits.slice(1);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return '998' + digits;
  }
  return digits;
}

/**
 * "+998 90 123 45 67" pretty form for the code-step subtitle.
 * Falls back to the raw digits when the input doesn't match the
 * standard Uzbek mobile shape (12 digits starting with 998).
 */
function prettifyPhone(canonical: string): string {
  if (canonical.length !== 12 || !canonical.startsWith('998')) {
    return canonical;
  }
  const a = canonical.slice(3, 5);
  const b = canonical.slice(5, 8);
  const c = canonical.slice(8, 10);
  const d = canonical.slice(10, 12);
  return `+998 ${a} ${b} ${c} ${d}`;
}

/** Cheap "looks like an Uzbek phone" check for client-side gating. */
function isValidUzPhone(canonical: string): boolean {
  return canonical.length === 12 && canonical.startsWith('998');
}

/** mm:ss countdown for the resend timer. Always at least "0:00". */
function formatCountdown(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  brand: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  logoDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 12,
  },
  brandTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    // No flex:1 — the card sizes to its content so the button hugs
    // the input. Vertical breathing room comes from the brand block
    // above and the bottomBar/language picker below; the card just
    // hosts the active step.
    marginTop: 28,
    marginHorizontal: 16,
    backgroundColor: '#141823',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepBody: {
    // Plain column — no flex:1. PhoneStep / CodeStep / RegisterStep
    // each lay their content out in natural order so the CTA sits
    // immediately under the inputs (no `marginTop:'auto'` push).
  },
  stepTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 22,
  },

  // Phone step
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  phonePrefix: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    fontFamily: Fonts.inter.medium,
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 0.5,
  },

  // Code step
  codeBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  codeBox: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#1A1F2B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: 'rgba(0, 207, 255, 0.55)',
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
  },
  codeBoxActive: {
    borderColor: '#00CFFF',
  },
  codeBoxDigit: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 26,
    color: Colors.text,
    letterSpacing: 1,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  devBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 18,
  },
  devBadgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  codeFooter: {
    marginTop: 18,
    gap: 10,
    alignItems: 'center',
  },
  resendCountdown: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#6B7280',
  },
  resendNow: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#00CFFF',
  },
  changePhone: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
    textDecorationLine: 'underline',
  },

  // Register step
  textInput: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    fontFamily: Fonts.inter.medium,
    fontSize: 15,
    color: Colors.text,
  },
  inputGap: {
    height: 10,
  },

  // Primary CTA — sits naturally after the form content, not pushed
  // to the bottom of the card. Pre-fix this used `marginTop: 'auto'`
  // which floated the button against the card's flex base and left
  // a tall empty gap above on the sparser phone-entry step.
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  primaryBtnFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 15,
    color: '#0B0F16',
    letterSpacing: 0.2,
  },
  primaryBtnTextMuted: {
    color: '#5A6A85',
  },

  // Bottom bar / language picker
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#141823',
  },
  langChipText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: Colors.text,
  },

  // Language modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalRow: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalRowActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.3)',
  },
  modalRowText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  modalRowTextActive: {
    color: '#00CFFF',
  },
});


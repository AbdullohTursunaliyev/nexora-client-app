import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  LayoutChangeEvent,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import LockIcon from '../components/icons/LockIcon';
import GoogleIcon from '../components/icons/GoogleIcon';
import FacebookIcon from '../components/icons/FacebookIcon';
import AppleIcon from '../components/icons/AppleIcon';
import TabProfileIcon from '../components/icons/TabProfileIcon';
import CheckIcon from '../components/icons/CheckIcon';
import { useAuth } from '../store/AuthProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT, useLocale } from '../lib/i18n/LocaleProvider';
import { LOCALE_NATIVE_LABEL, type Locale } from '../lib/i18n/translations';

type Tab = 'login' | 'register';

/**
 * Login / Register screen.
 *
 * Auth model: login + password (no SMS / OTP). The backend rule (mirrored
 * client-side so the user gets immediate feedback before round-trip):
 *
 *   login    → 3-64 chars, alphanumeric + `_`, `-`, `.`
 *   password → 3-255 chars  (relaxed from 8 to 3 per product decision —
 *              low-friction signup; stronger-password upgrade flow is a
 *              separate follow-up)
 *
 * The earlier phone-based flow was a placeholder — it sent the e164 phone
 * as the `login` field with a hardcoded `"otp"` password, which obviously
 * couldn't ever match a real account. Demo accounts are seeded server-side
 * (akmal / nodir / dilnoza / javlon, password `demo12345`) so this screen
 * just collects credentials and forwards them to AuthProvider.
 */
export default function LoginScreen() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loginFocus, setLoginFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [pwConfirmFocus, setPwConfirmFocus] = useState(false);

  // Animated tab indicator
  const [tabsWidth, setTabsWidth] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const halfTab = (tabsWidth - 8) / 2; // padding 4 on each side

  useEffect(() => {
    Animated.timing(indicatorAnim, {
      toValue: activeTab === 'login' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, indicatorAnim]);

  const { login, register } = useAuth();
  const toast = useToast();
  const { locale, setLocale } = useLocale();
  const insets = useSafeAreaInsets();
  const [langSheetOpen, setLangSheetOpen] = useState(false);

  // Bottom-sheet picker rather than a cycle button. Cycling hides the
  // available options behind a "tap again to see what you get" affordance
  // which a first-time user — especially one trying to find their native
  // language on a login screen — wouldn't discover. The sheet shows all
  // three locales at once with a check on the current one (matches the
  // pattern used by Settings → Language and the discover City sheet).
  const LOCALES: Locale[] = ['uz', 'ru', 'en'];
  const onPickLocale = async (next: Locale) => {
    setLangSheetOpen(false);
    if (next !== locale) await setLocale(next);
  };

  const isRegister = activeTab === 'register';

  // Mirror backend MobileAuthController validation exactly:
  //   login    regex /^[A-Za-z0-9_\-.]+$/, len 3-64
  //   password len 3-255  (relaxed from 8 → 3)
  const loginValid = /^[A-Za-z0-9_\-.]{3,64}$/.test(loginField);
  const passwordValid = password.length >= 3 && password.length <= 255;
  const passwordsMatch = !isRegister || password === passwordConfirm;
  const formValid = loginValid && passwordValid && passwordsMatch;

  const loginError = submitted && !loginValid ? t.login.errorLogin : null;
  const passwordError = submitted && !passwordValid ? t.login.errorPassword : null;
  const passwordConfirmError =
    submitted && isRegister && !passwordsMatch ? t.login.errorPasswordMismatch : null;

  const onSubmit = async () => {
    setSubmitted(true);
    if (!formValid) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({
          login: loginField,
          password,
          password_confirmation: passwordConfirm,
        });
        toast.success(t.login.registeredToast);
        // A fresh registration ALWAYS has zero clubs (the BE returns
        // `clubs: []` on /auth/register). Landing on `/(tabs)` would
        // drop the user onto the "join a club first" empty home tab
        // with no obvious next action. Send them straight to the
        // join-by-code screen — the first thing they need to do is
        // pick a club, and `/club-join` makes that the only path.
        router.replace('/club-join');
      } else {
        await login({ login: loginField, password });
        toast.success(t.login.welcomeToast);
        router.replace('/(tabs)');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onTabsLayout = (e: LayoutChangeEvent) => {
    setTabsWidth(e.nativeEvent.layout.width);
  };

  const indicatorTranslate = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, halfTab],
  });

  const onSocialPress = () => toast.info(t.login.socialSoonToast);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.langChip}
              onPress={() => setLangSheetOpen(true)}
              activeOpacity={0.75}
              hitSlop={6}
            >
              <Text style={styles.langEmoji}>🌐</Text>
              <Text style={styles.langText}>{LOCALE_NATIVE_LABEL[locale]}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>
            {t.login.titleLine1}
            {'\n'}
            {t.login.titleLine2} <Text style={styles.wave}>👋</Text>
          </Text>
          <Text style={styles.subtitle}>{t.login.subtitle}</Text>

          <View style={styles.tabsContainer} onLayout={onTabsLayout}>
            {halfTab > 0 && (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: halfTab,
                    transform: [{ translateX: indicatorTranslate }],
                  },
                ]}
              >
                <View style={styles.tabUnderline} />
              </Animated.View>
            )}
            <Pressable style={styles.tab} onPress={() => setActiveTab('login')}>
              <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                {t.login.tabs.signin}
              </Text>
            </Pressable>
            <Pressable style={styles.tab} onPress={() => setActiveTab('register')}>
              <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                {t.login.tabs.signup}
              </Text>
            </Pressable>
          </View>

          {/* Login field */}
          <View>
            <View
              style={[
                styles.inputWrapper,
                loginFocus && styles.inputWrapperFocused,
                loginError ? styles.inputWrapperError : null,
              ]}
            >
              <View style={styles.inputIcon}>
                <TabProfileIcon size={18} color={loginFocus ? '#00CFFF' : '#9CA3AF'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t.login.loginPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={loginField}
                onChangeText={setLoginField}
                onFocus={() => setLoginFocus(true)}
                onBlur={() => setLoginFocus(false)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                maxLength={64}
              />
              {loginValid && (
                <View style={styles.validBadge}>
                  <CheckIcon size={12} color={Colors.white} />
                </View>
              )}
            </View>
            {loginError && <Text style={styles.errorText}>{loginError}</Text>}
          </View>

          {/* Password field */}
          <View>
            <View
              style={[
                styles.inputWrapper,
                pwFocus && styles.inputWrapperFocused,
                passwordError ? styles.inputWrapperError : null,
              ]}
            >
              <View style={styles.inputIcon}>
                <LockIcon size={18} color={pwFocus ? '#00CFFF' : '#9CA3AF'} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t.login.passwordPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                textContentType={isRegister ? 'newPassword' : 'password'}
                maxLength={255}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={10}
                style={styles.eyeBtn}
                accessibilityLabel={
                  showPassword ? t.login.hidePasswordA11y : t.login.showPasswordA11y
                }
              >
                {showPassword ? (
                  <EyeOff size={18} color="#9CA3AF" />
                ) : (
                  <Eye size={18} color="#9CA3AF" />
                )}
              </Pressable>
            </View>
            {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          {/* Confirm password (register only) */}
          {isRegister && (
            <View>
              <View
                style={[
                  styles.inputWrapper,
                  pwConfirmFocus && styles.inputWrapperFocused,
                  passwordConfirmError ? styles.inputWrapperError : null,
                ]}
              >
                <View style={styles.inputIcon}>
                  <LockIcon size={18} color={pwConfirmFocus ? '#00CFFF' : '#9CA3AF'} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t.login.passwordConfirmPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  onFocus={() => setPwConfirmFocus(true)}
                  onBlur={() => setPwConfirmFocus(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  maxLength={255}
                />
              </View>
              {passwordConfirmError && (
                <Text style={styles.errorText}>{passwordConfirmError}</Text>
              )}
            </View>
          )}

          <View style={styles.primaryWrap}>
            {/* Inline submit CTA — pre-fix this used the shared
                <Button /> component which forced a sm/md/lg discrete
                sizing system on every call site. The login submit
                wants ONE specific shape (52pt tall, full pill,
                gradient fill, 16pt internal gap so the spinner and
                label sit centred), and the same shape never reads
                quite the same when reused by every other CTA in the
                app via the same shared component. Inlining lets this
                button's proportions match exactly what the login
                layout needs without imposing on anything else. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSubmit}
              disabled={!formValid || submitting}
              accessibilityRole="button"
              accessibilityLabel={isRegister ? t.login.signupBtn : t.login.continue}
              accessibilityState={{ disabled: !formValid || submitting, busy: submitting }}
              style={[
                loginStyles.submitBtn,
                (!formValid || submitting) && loginStyles.submitBtnDisabled,
              ]}
            >
              <LinearGradient
                colors={['#3B5BF5', '#8B3DF5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={loginStyles.submitBtnFill}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text
                      style={loginStyles.submitBtnText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {t.login.checkingLabel}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={loginStyles.submitBtnText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {isRegister ? t.login.signupBtn : t.login.continue}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t.login.divider}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} onPress={onSocialPress}>
              <GoogleIcon size={24} />
              <Text style={styles.socialLabel}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} onPress={onSocialPress}>
              <FacebookIcon size={24} />
              <Text style={styles.socialLabel}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} onPress={onSocialPress}>
              <AppleIcon size={22} color="#FFFFFF" />
              <Text style={styles.socialLabel}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isRegister ? t.login.haveAccount : t.login.noAccount}
              <Text
                style={styles.footerLink}
                onPress={() => {
                  setSubmitted(false);
                  setActiveTab(isRegister ? 'login' : 'register');
                }}
              >
                {isRegister ? t.login.signinLink : t.login.signupLink}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={langSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLangSheetOpen(false)}
        statusBarTranslucent
      >
        {/* Sibling-backdrop pattern — pre-fix this used the nested
            `<Pressable backdrop>{<Pressable sheet stopPropagation>}`
            antipattern, which doesn't map cleanly to React Native's
            gesture system (taps inside the sheet can bubble to the
            backdrop and dismiss the modal). Same fix applied across
            qr-scan, settings, help-support sheets. Audit M8. */}
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLangSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
          />
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.language.title}</Text>
            <Text style={styles.sheetSub}>{t.language.subtitle}</Text>

            <View style={styles.sheetList}>
              {LOCALES.map((loc) => {
                const isActive = loc === locale;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.sheetRow, isActive && styles.sheetRowActive]}
                    activeOpacity={0.7}
                    onPress={() => onPickLocale(loc)}
                  >
                    <Text style={styles.sheetRowFlag}>
                      {loc === 'uz' ? '🇺🇿' : loc === 'ru' ? '🇷🇺' : '🇬🇧'}
                    </Text>
                    <Text style={styles.sheetRowLabel}>{LOCALE_NATIVE_LABEL[loc]}</Text>
                    {isActive && (
                      <View style={styles.sheetCheckBg}>
                        <CheckIcon size={12} color={Colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 },
  // Top row carries the language switcher — small pill in the top-right.
  // Users on a fresh install land in the default locale (uz); tapping
  // the pill cycles to the next supported language without leaving
  // the login screen, so they never see an unreadable form.
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  langEmoji: { fontSize: 14 },
  langText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#00CFFF',
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
    marginTop: 20,
    letterSpacing: -0.4,
  },
  wave: { fontSize: 22 },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#8B95A8',
    marginTop: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 26,
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 4,
    height: 48,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: '#1F2533',
    borderRadius: 10,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    height: 2,
    width: 36,
    left: '50%',
    marginLeft: -18,
    backgroundColor: '#00CFFF',
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabText: { fontFamily: Fonts.inter.medium, fontSize: 14.5, color: '#8B95A8' },
  tabTextActive: { color: Colors.text, fontFamily: Fonts.inter.semiBold },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 52,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: 'rgba(0, 207, 255, 0.55)',
    backgroundColor: '#161E2C',
  },
  inputWrapperError: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  inputIcon: { marginRight: 12, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    color: Colors.text,
    fontFamily: Fonts.inter.regular,
    fontSize: 14.5,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  validBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  primaryWrap: { marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 14, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: { color: '#6B7280', fontFamily: Fonts.inter.regular, fontSize: 12.5 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialButton: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  socialLabel: { fontFamily: Fonts.inter.medium, fontSize: 12.5, color: Colors.text },
  spacer: { flex: 1, minHeight: 16 },
  footer: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  footerText: { fontFamily: Fonts.inter.regular, fontSize: 13.5, color: '#8B95A8' },
  footerLink: { color: '#00CFFF', fontFamily: Fonts.inter.medium },
  // Bottom-sheet language picker — matches the visual rhythm of
  // discover/CitySheet (handle, dark card, gradient-tinted active row).
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
  },
  sheetSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    marginTop: 4,
    marginBottom: 14,
  },
  sheetList: { gap: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2B',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sheetRowActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  sheetRowFlag: { fontSize: 22 },
  sheetRowLabel: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  sheetCheckBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Inline styles for the submit CTA. Lives in its own StyleSheet
 * (rather than merged into the main `styles` object) so the button-
 * specific dimensions are clearly grouped and easy to tweak without
 * scrolling through the screen's broader layout rules. Pre-fix this
 * lived inside the shared <Button /> component's `sm/md/lg` sizing
 * map, which couldn't be tuned for the login screen specifically.
 */
const loginStyles = StyleSheet.create({
  submitBtn: {
    height: 52,
    borderRadius: 999,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

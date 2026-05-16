import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import * as clubsApi from '../lib/api/services/clubs';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import { useAuth } from '../store/AuthProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

// BE enforces these floors (see MobileClubController::registerAtClub).
// Mirroring on the FE saves a useless 422 round-trip and gives the
// user immediate inline feedback.
//
// Password min length dropped from 8 → 4 on operator request — the
// per-club password is what the user types on the kiosk PC at the
// cashier; 8 chars was friction without proportional security value
// (the operator already gates physical access to the seat).
const LOGIN_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 4;
const LOGIN_ALLOWED_RE = /^[A-Za-z0-9_\-.]+$/;

/**
 * Club registration screen (phone-auth flow).
 *
 * The legacy invite-code flow asked the user for a tenant-wide join
 * code + password. With phone-auth we already know who the user is
 * (the OTP at app login proved phone ownership), and operators
 * don't want to mint invite codes for every customer. The new flow:
 *
 *   1. User taps "Join" on a club preview → lands here with the
 *      tenant id + name in route params.
 *   2. User picks their own per-club login + password.
 *   3. POST /mobile/club/register pairs (tenant_id, login, password,
 *      phone) into a Client row. If an operator-pre-created row with
 *      a matching phone already exists at the tenant, the BE claims
 *      it (preserves existing balance / bonus) instead of inserting
 *      a duplicate.
 *
 * Without tenant context (somebody navigated here directly from a
 * generic "+ Add club" button), we show an empty state pointing
 * them at Discover — joining an unknown club doesn't have a sane
 * default tenant.
 */
export default function ClubJoinScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refreshMe } = useAuth();
  const params = useLocalSearchParams<{ tenantId?: string; tenantName?: string }>();
  const tenantId = (() => {
    const raw = typeof params.tenantId === 'string' ? params.tenantId : '';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const tenantName = typeof params.tenantName === 'string' ? params.tenantName : '';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!tenantId) return;
    const trimmed = login.trim();
    if (trimmed.length < LOGIN_MIN_LENGTH || !LOGIN_ALLOWED_RE.test(trimmed)) {
      toast.error(
        t.clubJoin.errorLoginShape.replace('{n}', String(LOGIN_MIN_LENGTH)),
      );
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(
        t.clubJoin.errorPasswordTooShort.replace('{n}', String(PASSWORD_MIN_LENGTH)),
      );
      return;
    }
    setLoading(true);
    try {
      await clubsApi.registerAtClub(tenantId, trimmed, password);
      // Re-fetch the user's membership list BEFORE navigating away
      // so the home tab renders the just-joined club without a cold
      // restart. /auth/me populates AuthProvider.clubs.
      try {
        await refreshMe();
      } catch {
        // Non-fatal; next focus refresh will pick it up.
      }
      toast.success(t.clubJoin.successToast);
      router.replace('/(tabs)');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!tenantId &&
    login.trim().length >= LOGIN_MIN_LENGTH &&
    LOGIN_ALLOWED_RE.test(login.trim()) &&
    password.length >= PASSWORD_MIN_LENGTH &&
    !loading;

  // No tenant context → empty state. Sends the user back to Discover
  // where they can pick a real club.
  if (!tenantId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SimpleHeader title={t.clubJoin.headerTitle} />
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔎</Text>
          <Text style={styles.emptyTitle}>{t.clubJoin.pickClubTitle}</Text>
          <Text style={styles.emptySub}>{t.clubJoin.pickClubSub}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)/discover')}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.emptyCtaFill}
            >
              <Text style={styles.emptyCtaText}>{t.clubJoin.pickClubBtn}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
        <SimpleHeader title={t.clubJoin.headerTitle} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroIcon}>
            <LinearGradient
              colors={['#00CFFF', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroIconRing}
            >
              <View style={styles.heroIconInner}>
                <LocationPinIcon size={36} color="#00CFFF" />
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.title}>
            {tenantName
              ? t.clubJoin.titleForClub.replace('{club}', tenantName)
              : t.clubJoin.title}
          </Text>
          <Text style={styles.subtitle}>{t.clubJoin.subtitle}</Text>

          <Text style={styles.fieldLabel}>{t.clubJoin.loginLabel}</Text>
          <View style={styles.fieldWrap}>
            <TextInput
              style={styles.input}
              placeholder={t.clubJoin.loginPlaceholder}
              placeholderTextColor="#6B7280"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={64}
              returnKeyType="next"
            />
          </View>
          <Text style={styles.fieldHint}>{t.clubJoin.loginHint}</Text>

          <Text style={[styles.fieldLabel, styles.labelGap]}>
            {t.clubJoin.passwordLabel}
          </Text>
          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t.clubJoin.passwordPlaceholder.replace(
                '{n}',
                String(PASSWORD_MIN_LENGTH),
              )}
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!passwordVisible}
              textContentType="newPassword"
              maxLength={64}
              returnKeyType="go"
              onSubmitEditing={canSubmit ? onSubmit : undefined}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible ? t.clubJoin.passwordHide : t.clubJoin.passwordShow
              }
            >
              {passwordVisible ? (
                <EyeOff size={18} color="#8B95A8" />
              ) : (
                <Eye size={18} color="#8B95A8" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldHint}>
            {t.clubJoin.passwordHint.replace('{n}', String(PASSWORD_MIN_LENGTH))}
          </Text>

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>{t.clubJoin.helpTitle}</Text>
            <Text style={styles.helpText}>{t.clubJoin.helpText}</Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={t.clubJoin.joinBtn}
            accessibilityState={{ disabled: !canSubmit, busy: loading }}
            style={[joinStyles.btn, !canSubmit && joinStyles.btnDisabled]}
          >
            <LinearGradient
              colors={canSubmit ? ['#3B5BF5', '#8B3DF5'] : ['#2A3142', '#2A3142']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={joinStyles.btnFill}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    joinStyles.btnText,
                    !canSubmit && joinStyles.btnTextMuted,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t.clubJoin.joinBtn}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  emptyCta: { height: 48, borderRadius: 999, overflow: 'hidden', alignSelf: 'stretch' },
  emptyCtaFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyCtaText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  heroIcon: { marginTop: 12, marginBottom: 16 },
  heroIconRing: { width: 90, height: 90, borderRadius: 45, padding: 3 },
  heroIconInner: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    backgroundColor: '#0B0F16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#8B95A8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  fieldLabel: {
    width: '100%',
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
    marginBottom: 6,
  },
  labelGap: { marginTop: 14 },
  fieldWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  passwordInput: {},
  fieldHint: {
    width: '100%',
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  helpCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.15)',
  },
  helpTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: '#00CFFF',
    marginBottom: 6,
  },
  helpText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 19,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});

const joinStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  btnTextMuted: { color: '#5A6A85' },
});

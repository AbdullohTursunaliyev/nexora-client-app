import { lazy, Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import QrIcon from '../components/icons/QrIcon';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import Button from '../components/common/Button';
import * as clubsApi from '../lib/api/services/clubs';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import { useAuth } from '../store/AuthProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';

// BE enforces min 8 chars on the per-club password (see
// MobileClubController::joinByCode validator). Mirroring on the
// FE saves the user a round-trip with a useless 422 toast.
const PASSWORD_MIN_LENGTH = 8;

// Lazy-load the camera scanner — same Expo Go module-load defence
// as in qr-scan.tsx. expo-camera triggers a native bridge call at
// import time which crashes Expo Go if the bundle traverses this
// file eagerly.
const QrScannerModal = lazy(() => import('../components/qr/QrScannerModal'));

export default function ClubJoinScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refreshMe } = useAuth();
  // Prefilled code from the discover-preview screen — when the
  // user taps "Join" on a club-preview that already has a code in
  // its route params, we land here with the same code so they
  // don't have to retype it.
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() =>
    typeof params.code === 'string' ? params.code.toUpperCase() : '',
  );
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  /**
   * Parse a scanned QR into a join code. Two formats we accept:
   *   • Raw code string  — "NEX12345" — just trim and use.
   *   • URL form         — "nexora://join?code=NEX12345" — extract.
   *
   * Anything else (whitespace, blank) returns null so the user gets
   * the same "code is empty" error path as a missed text-input submit.
   */
  const parseJoinQr = (raw: string): string | null => {
    const text = raw.trim();
    if (!text) return null;
    try {
      const u = new URL(text);
      const param = u.searchParams.get('code');
      if (param && param.trim()) return param.trim().toUpperCase();
    } catch {
      // Not a URL — fall through to raw form.
    }
    return text.toUpperCase();
  };

  /**
   * Scanner callback — fills the code input. We DON'T auto-submit
   * because the user still needs to enter a password; scanning is
   * just a shortcut for typing the 8-12 char join code.
   *
   * Pre-fix this used `setTimeout(() => doJoin(parsed), 0)` to
   * bypass the closure-stale-state issue of submitting from inside
   * onChangeText. Now that password is mandatory, the auto-submit
   * was always going to fail anyway — better UX is to set the code
   * and let the user focus the password field.
   */
  const onScanned = useCallback(
    (raw: string) => {
      const parsed = parseJoinQr(raw);
      if (!parsed) {
        toast.error(t.clubJoin.errorEmpty);
        return;
      }
      setCode(parsed);
      toast.info(t.clubJoin.scannedFillPasswordHint);
    },
    [toast, t],
  );

  const onJoin = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      toast.error(t.clubJoin.errorEmpty);
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
      await clubsApi.joinByCode(trimmedCode, password);
      // Re-fetch the user's membership list BEFORE navigating home —
      // otherwise AuthProvider.clubs still has the pre-join state and
      // the home tab renders without the just-joined club. The user
      // had to fully restart the app to see it (reported as P0 bug in
      // the pre-deploy audit). `refreshMe()` calls /auth/me which
      // surfaces the new ClubMembership row.
      try {
        await refreshMe();
      } catch {
        // /auth/me failure shouldn't block the user from leaving the
        // screen — they'll see the new club on next focus refresh.
      }
      toast.success(t.clubJoin.successToast);
      router.replace('/(tabs)');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <SimpleHeader title={t.clubJoin.headerTitle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <Text style={styles.title}>{t.clubJoin.title}</Text>
        <Text style={styles.subtitle}>{t.clubJoin.subtitle}</Text>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder={t.clubJoin.placeholder}
            placeholderTextColor="#6B7280"
            value={code}
            onChangeText={(c) => setCode(c.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
            returnKeyType="next"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.qrAlt}
          onPress={() => setScannerOpen(true)}
        >
          <QrIcon size={18} color="#00CFFF" />
          <Text style={styles.qrAltText}>{t.clubJoin.qrAlt}</Text>
        </TouchableOpacity>

        {/* Per-club password — the BE enforces this on join (was
            SEC-H7: nullable password let attackers create rows
            with `password IS NULL` and silently link to anyone
            else's login). Show/hide toggle is the convention for
            sign-up flows so the user can verify they typed it
            correctly before commit. */}
        <View style={styles.passwordLabel}>
          <Text style={styles.passwordLabelText}>{t.clubJoin.passwordLabel}</Text>
        </View>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
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
            textContentType="password"
            maxLength={64}
            returnKeyType="go"
            onSubmitEditing={onJoin}
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
        <Text style={styles.passwordHint}>
          {t.clubJoin.passwordHint.replace('{n}', String(PASSWORD_MIN_LENGTH))}
        </Text>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>{t.clubJoin.helpTitle}</Text>
          <Text style={styles.helpText}>{t.clubJoin.helpText}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          label={t.clubJoin.joinBtn}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          // Button-side disable mirrors the BE validation gates —
          // empty code OR too-short password keep the button
          // unavailable so the user can't fire a guaranteed 422.
          disabled={!code.trim() || password.length < PASSWORD_MIN_LENGTH || loading}
          onPress={onJoin}
        />
      </View>
      </KeyboardSafeView>

      <Suspense fallback={null}>
        {scannerOpen && (
          <QrScannerModal
            visible={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={onScanned}
          />
        )}
      </Suspense>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
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
    marginBottom: 24,
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    justifyContent: 'center',
  },
  input: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 0,
  },
  qrAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  qrAltText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#00CFFF',
  },
  // Password label — sits above the input field so the user
  // understands which credential we're asking for (per-club, not
  // their mobile-auth login password).
  passwordLabel: {
    width: '100%',
    marginTop: 14,
    marginBottom: 6,
  },
  passwordLabelText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  passwordWrap: {
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
  passwordInput: {
    flex: 1,
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  passwordHint: {
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
    marginTop: 14,
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

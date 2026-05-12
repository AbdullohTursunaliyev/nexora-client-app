import { lazy, Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import LightningIcon from '../components/icons/LightningIcon';
import GalleryIcon from '../components/icons/GalleryIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import { useToast } from '../components/common/Toast';
import * as pcsApi from '../lib/api/services/pcs';
import { getErrorMessage } from '../lib/api/client';
import { useAuth } from '../store/AuthProvider';

/**
 * Lazy-load the embedded camera so `expo-camera`'s native bridge
 * isn't invoked until the user actually navigates to /qr-scan.
 * Pre-fix the static import would crash Expo Go at route-walk time
 * with "Something went wrong" before the user ever opened the
 * scanner screen.
 */
const QrCameraEmbed = lazy(() => import('../components/qr/QrCameraEmbed'));

/**
 * QR-scan screen — camera-first redesign (v3).
 *
 * History:
 *   v1: Static decorative user-identity QR in the middle + manual
 *       entry split the screen 50/50. Two competing CTAs and a
 *       circular "Инструкция по QR" toast.
 *   v2: Removed the decorative QR; replaced with an empty viewfinder
 *       placeholder + "Tap to scan" button → modal-based scanner.
 *   v3 (this version): Industry-standard camera-first layout.
 *       Live camera fills the upper half of the screen, viewfinder
 *       overlay tells the user where to align the QR. Below: flash
 *       toggle, gallery picker, and a small manual-entry link that
 *       opens a sheet. Help moved to a header icon → bottom sheet.
 *
 * Why camera-first:
 *   WhatsApp, Telegram, Revolut, PayPal, Sberbank, Tinkoff — every
 *   well-rated QR flow shows the live camera AS the primary visual.
 *   The "tap to open camera" intermediary screen is a custom pattern
 *   that adds friction (extra tap, extra navigation event, slower
 *   permission resolution). The v2 redesign fixed many bugs but kept
 *   that non-standard splash; this version aligns with the
 *   convention users already know.
 *
 *   Permission gate, manual-code fallback, and gallery fallback are
 *   preserved — they're industry-standard too. They're just rearranged
 *   so the primary path (point camera at sticker → done) is the
 *   default screen state.
 */
export default function QrScanScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { currentTenantId, clubs } = useAuth();

  // Scan / submit / sheet states.
  const [submitting, setSubmitting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [galleryPicking, setGalleryPicking] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [code, setCode] = useState('');

  const noActiveTenant = !currentTenantId;
  const hasClubs = (clubs?.length ?? 0) > 0;

  /**
   * QR sticker payload format: `<pc_id>:<secret>` (e.g. `42:abc123`).
   * Also accepts URL-style payloads `nexora://open?pc=42&code=abc123`.
   */
  const parseQr = (raw: string): { pcId: number; code: string } | null => {
    const text = raw.trim();
    if (!text) return null;

    try {
      const u = new URL(text);
      const pc = Number(u.searchParams.get('pc'));
      const c = u.searchParams.get('code') ?? '';
      if (Number.isFinite(pc) && pc > 0 && c) return { pcId: pc, code: c };
    } catch {
      // not a URL — fall through
    }

    const m = text.match(/^(?:PC[-_]?)?(\d+)[:\-_/](.+)$/i);
    if (m && m[1] && m[2]) {
      return { pcId: Number(m[1]), code: m[2] };
    }
    return null;
  };

  const submitParsed = useCallback(
    async (parsed: { pcId: number; code: string }) => {
      setSubmitting(true);
      try {
        const res = await pcsApi.openByQr({ pc_id: parsed.pcId, code: parsed.code });
        if (res.ok) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          router.replace('/active-session');
        } else {
          toast.error(getErrorMessage(new Error('QR code not recognized')));
        }
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [toast],
  );

  /**
   * Unified scan handler — invoked from the live camera, the gallery
   * picker, and the manual submit button. Centralises parse → submit
   * + error fallback (open the manual sheet pre-filled with the raw
   * payload so the user can fix it).
   */
  const handleScanned = useCallback(
    (raw: string) => {
      const parsed = parseQr(raw);
      if (!parsed) {
        setCode(raw.toUpperCase());
        setManualOpen(true);
        toast.error(t.qrScan.invalidFormat);
        return;
      }
      setCode(`${parsed.pcId}:${parsed.code}`);
      void submitParsed(parsed);
    },
    [submitParsed, toast, t],
  );

  // Live-camera onScan — gated on tenant + submitting state so we
  // don't fire double submissions if the camera detects a QR while
  // a previous one is still being processed.
  const onCameraScan = useCallback(
    (raw: string) => {
      if (noActiveTenant || submitting) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      handleScanned(raw);
    },
    [noActiveTenant, submitting, handleScanned],
  );

  /**
   * Direct-from-gallery decode — uses scanFromURLAsync from
   * expo-camera, lazy-imported inside the handler so the native
   * bridge only loads when the user invokes it.
   */
  const onPickFromGallery = useCallback(async () => {
    if (noActiveTenant) {
      toast.error(t.qrScan.noTenantToast);
      return;
    }
    if (galleryPicking || submitting) return;
    setGalleryPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.error(t.qrScan.galleryDenied);
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (picked.canceled) return;
      const uri = picked.assets?.[0]?.uri;
      if (!uri) return;
      const { scanFromURLAsync } = await import('expo-camera');
      const results = await scanFromURLAsync(uri, ['qr']);
      const decoded = results?.[0]?.data;
      if (!decoded) {
        toast.error(t.qrScan.galleryDecodeFailed);
        return;
      }
      handleScanned(decoded);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setGalleryPicking(false);
    }
  }, [noActiveTenant, galleryPicking, submitting, toast, t, handleScanned]);

  const onManualSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const parsed = parseQr(trimmed);
    if (!parsed) {
      toast.error(t.qrScan.invalidFormat);
      return;
    }
    setManualOpen(false);
    await submitParsed(parsed);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.qrScan.headerTitle} />

      <View style={styles.body}>
        {noActiveTenant ? (
          // No active tenant — replace the camera area with a
          // clear actionable gate card. Embedding the camera while
          // disabled-but-visible would be misleading (the user
          // could point at a QR, see it light up, and then get
          // a 401 from the BE).
          <View style={styles.gateWrap}>
            <View style={styles.gateCard}>
              <Text style={styles.gateTitle}>{t.qrScan.noTenantTitle}</Text>
              <Text style={styles.gateSub}>
                {hasClubs ? t.qrScan.noTenantHasClubs : t.qrScan.noTenantNoClubs}
              </Text>
              <View style={styles.gateBtnWrap}>
                <Button
                  label={hasClubs ? t.qrScan.pickClubBtn : t.qrScan.joinClubBtn}
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={() => router.push(hasClubs ? '/(tabs)/profile' : '/club-join')}
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.cameraWrap}>
              <Suspense
                fallback={
                  <View style={styles.cameraFallback}>
                    <ActivityIndicator color="#00CFFF" size="large" />
                  </View>
                }
              >
                <QrCameraEmbed
                  onScan={onCameraScan}
                  torchOn={torchOn}
                  paused={submitting}
                />
              </Suspense>

              {/* Loading veil while the BE call from a scan is in
                  flight. Sits OVER the camera so the user sees a
                  clear "we got your scan, processing" state instead
                  of a still camera that looks frozen. */}
              {submitting && (
                <View style={styles.submittingVeil} pointerEvents="none">
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.submittingText}>{t.qrScan.submittingHint}</Text>
                </View>
              )}
            </View>

            {/* Bottom-bar action row — flash + gallery. Matches the
                control row inside Telegram/WhatsApp QR scan screens. */}
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, torchOn && styles.actionBtnOn]}
                onPress={() => setTorchOn((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ selected: torchOn }}
                accessibilityLabel={t.qrScan.actionFlash}
              >
                <LightningIcon size={18} color={torchOn ? '#0B0F16' : '#F59E0B'} />
                <Text style={[styles.actionText, torchOn && styles.actionTextOn]}>
                  {t.qrScan.actionFlash}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  (galleryPicking || submitting) && styles.actionBtnDisabled,
                ]}
                onPress={onPickFromGallery}
                disabled={galleryPicking || submitting}
                accessibilityRole="button"
                accessibilityLabel={t.qrScan.actionGallery}
              >
                {galleryPicking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <GalleryIcon size={18} color="#FFFFFF" />
                )}
                <Text style={styles.actionText}>{t.qrScan.actionGallery}</Text>
              </Pressable>
            </View>

            {/* Bottom links row — manual entry + help. Both open
                bottom sheets. Industry pattern (Revolut, Tinkoff)
                groups secondary actions as text links below the
                primary controls so the screen's visual weight stays
                with the camera + flash/gallery. */}
            <View style={styles.linksRow}>
              <TouchableOpacity
                style={styles.linkBtn}
                activeOpacity={0.7}
                onPress={() => setManualOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t.qrScan.manualToggle}
              >
                <Text style={styles.linkText}>{t.qrScan.manualToggle}</Text>
              </TouchableOpacity>
              <View style={styles.linkDot} />
              <TouchableOpacity
                style={styles.linkBtn}
                activeOpacity={0.7}
                onPress={() => setHelpOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t.qrScan.guide}
              >
                <Text style={styles.linkText}>{t.qrScan.guide}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Manual entry bottom sheet — slides up from the bottom edge.
          Standard pattern across iOS / Android for "secondary action
          drawer". Backdrop dismiss + an explicit X for accessibility.

          KeyboardSafeView avoids the soft-keyboard covering the
          submit button when the user types a code. */}
      <Modal
        visible={manualOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setManualOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setManualOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <KeyboardSafeView>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t.qrScan.manualToggle}</Text>
                <TouchableOpacity
                  onPress={() => setManualOpen(false)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t.common.cancel}
                >
                  <X size={20} color="#8B95A8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetSub}>{t.qrScan.manualHint}</Text>
              <View style={styles.codeInputWrap}>
                <TextInput
                  style={styles.codeInput}
                  placeholder={t.qrScan.manualPlaceholder}
                  placeholderTextColor="#3A4250"
                  value={code}
                  onChangeText={(c) => setCode(c.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  maxLength={40}
                  onSubmitEditing={onManualSubmit}
                  returnKeyType="go"
                />
              </View>
              <View
                style={[styles.sheetSubmitWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
              >
                <Button
                  label={t.qrScan.manualSubmit}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={!code.trim() || submitting}
                  onPress={onManualSubmit}
                />
              </View>
            </KeyboardSafeView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Help bottom sheet — 3 concrete steps. Replaces the v1's
          circular "tap the link to see the same subtitle as a toast"
          anti-pattern. */}
      <Modal
        visible={helpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.qrScan.guide}</Text>
              <TouchableOpacity
                onPress={() => setHelpOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t.common.cancel}
              >
                <X size={20} color="#8B95A8" />
              </TouchableOpacity>
            </View>
            <View style={[styles.helpSteps, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              {[t.qrScan.helpStep1, t.qrScan.helpStep2, t.qrScan.helpStep3].map((step, i) => (
                <View key={i} style={styles.helpStepRow}>
                  <View style={styles.helpStepNumWrap}>
                    <Text style={styles.helpStepNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.helpStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Camera takes up to ~60% of available height. The aspect-ratio
  // 1 in QrCameraEmbed makes the frame square at the screen's width.
  cameraWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0F16',
  },
  submittingVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submittingText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  // Action row — two equal pills side by side. Matches the
  // control row used in the in-modal scanner so the visual idiom
  // is consistent.
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#141823',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionBtnOn: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  actionTextOn: {
    color: '#0B0F16',
  },
  // Bottom links row — secondary navigation actions. Style mimics
  // tap-target text links commonly used as "footer" CTAs in
  // banking / wallet apps (Revolut "More options", Tinkoff "Help").
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginTop: 4,
    gap: 10,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#00CFFF',
  },
  // Tiny dot separator between the two link buttons. Standard
  // typographic divider — same look as the "5 min ago · Unread"
  // pattern in mail clients.
  linkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3A4250',
  },
  // No-tenant gate state — replaces the camera area entirely.
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gateCard: {
    width: '100%',
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  gateTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  gateSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    lineHeight: 19,
  },
  gateBtnWrap: {
    marginTop: 10,
  },
  // Bottom sheets — shared style between manual entry + help.
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2F3A',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  sheetSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    lineHeight: 18,
    marginBottom: 14,
  },
  codeInputWrap: {
    width: '100%',
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    justifyContent: 'center',
    marginBottom: 16,
  },
  codeInput: {
    fontFamily: Fonts.orbitron.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: 2.5,
    textAlign: 'center',
    paddingVertical: 0,
  },
  sheetSubmitWrap: {
    width: '100%',
    paddingTop: 4,
  },
  helpSteps: {
    gap: 14,
    paddingTop: 4,
  },
  helpStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  helpStepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpStepNum: {
    fontFamily: Fonts.inter.bold,
    fontSize: 13,
    color: '#00CFFF',
  },
  helpStepText: {
    flex: 1,
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: Colors.text,
    lineHeight: 20,
  },
});

import { lazy, Suspense, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import LightningIcon from '../components/icons/LightningIcon';
import GalleryIcon from '../components/icons/GalleryIcon';
import { useT } from '../lib/i18n/LocaleProvider';
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
 *   v3: Industry-standard camera-first layout. Live camera fills
 *       the upper half of the screen, viewfinder overlay tells the
 *       user where to align the QR. Below: flash toggle, gallery
 *       picker, and a small manual-entry link that opens a sheet.
 *   v4 (this version): manual-entry link + sheet removed. Operator
 *       JSON stickers run up to ~50 chars; typing them by hand is
 *       a UX dead-end at the best of times, and the truncated
 *       Orbitron+tracking input slot made it actively confusing
 *       (user retypes the visible fragment, parser rejects). Camera
 *       and gallery decode are the supported entry points.
 *
 * Why camera-first:
 *   WhatsApp, Telegram, Revolut, PayPal, Sberbank, Tinkoff — every
 *   well-rated QR flow shows the live camera AS the primary visual.
 *   The "tap to open camera" intermediary screen is a custom pattern
 *   that adds friction (extra tap, extra navigation event, slower
 *   permission resolution); this screen aligns with the convention.
 *
 *   Permission gate + gallery fallback are preserved — both are
 *   industry-standard and don't require keyboard input.
 */
export default function QrScanScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { currentTenantId, clubs } = useAuth();

  // Scan / submit / sheet states. Manual-entry sheet was removed in
  // favour of camera + gallery only — typing a 44-char operator JSON
  // by hand was a UX dead-end, and the screen reads cleaner without
  // the link competing with the camera CTA.
  const [submitting, setSubmitting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [galleryPicking, setGalleryPicking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const noActiveTenant = !currentTenantId;
  const hasClubs = (clubs?.length ?? 0) > 0;

  /**
   * Accepted QR sticker payloads (operators ship at least one of these
   * shapes; the parser tries each in order and returns the PC's
   * tenant-scoped `code` label — e.g. "PC-01" / "A28" / "VIP12" —
   * which the BE looks up directly via the `(tenant_id, code)`
   * UNIQUE index):
   *
   *   1. Plain bare label:   "PC-01" / "A28" / "42"
   *   2. URL-style:          "nexora://open?code=PC-01"
   *   3. JSON-style:         {"ID":"PC-01"} / {"code":"PC-01"}
   *                          {"TYPE":"PC","ID":"PC-01","CODE":"..."}
   *   4. Lenient extraction: any `id=PC-01` / `"id":"PC-01"` pair
   *
   * Pre-fix the parser tried to derive a numeric pc_id (the BE's
   * integer primary key) from the sticker label — but operator
   * stickers print the LABEL ("PC-01"), not the id, and the digit
   * extraction heuristic ("01" → 1) was wrong for any tenant whose
   * label numbering didn't match its database id sequence. The
   * BE+FE QR contract is now `code`-only: the FE forwards whatever
   * the sticker prints and the BE does the tenant-scoped lookup.
   *
   * JSON branch field-name priority (for sticker payloads that wrap
   * the label in a structured object):
   *   - `id` / `ID` / `pc_id` / `pcid` — the per-PC display label
   *   - `code` / `CODE` — only as fallback if no id field is present,
   *     since operators ship `CODE` with different semantics ("PC:PC-01"
   *     is a composite, not the lookup key for `pcs.code`)
   */
  const parseQr = (raw: string): { code: string } | null => {
    let text = raw.trim();
    if (!text) return null;

    // Strip surrounding single/double quotes — operators sometimes
    // export the QR payload wrapped in quotes (e.g. from a docs page
    // or chat thread). Without this `'{"ID":...}'` would skip the JSON
    // branch because text doesn't start with `{`.
    if (
      (text.startsWith("'") && text.endsWith("'")) ||
      (text.startsWith('"') && text.endsWith('"'))
    ) {
      text = text.slice(1, -1).trim();
    }

    // #2: URL-style — tried first because it's the only shape where the
    // payload contains literal `://`, so we don't accidentally route a
    // URL into the colon-style branch and lose the query string.
    try {
      const u = new URL(text);
      const codeParam = u.searchParams.get('code') ?? u.searchParams.get('id');
      if (codeParam) return { code: codeParam };
    } catch {
      // not a URL — fall through
    }

    // #3: JSON-style — look for any `{...}` substring inside the text.
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      let jsonCandidate = text.slice(jsonStart, jsonEnd + 1);
      // Normalise Unicode smart-quotes back to ASCII. Some clipboards
      // (iOS Notes, macOS Pages, Telegram on some platforms) auto-
      // convert " → "/" and ' → '/'.
      jsonCandidate = jsonCandidate
        .replace(/[“”„‟″‶]/g, '"')
        .replace(/[‘’‚‛′‵]/g, "'");
      try {
        const obj = JSON.parse(jsonCandidate) as Record<string, unknown>;
        const lcMap: Record<string, unknown> = {};
        for (const k of Object.keys(obj)) lcMap[k.toLowerCase()] = obj[k];
        const findKey = (...keys: string[]): unknown => {
          for (const k of keys) {
            const v = lcMap[k.toLowerCase()];
            if (v != null) return v;
          }
          return null;
        };
        // Field priority — operators ship the per-PC label under
        // different keys; we have to try them in order of specificity:
        //
        //   1. pc_code / pccode  — explicit per-PC label key. This is
        //      the shape the user's real stickers use:
        //          {"pc_code":"PC-01","code":"pc:PC-01"}
        //      where `code` is a composite tenant:pc string and
        //      `pc_code` is the actual lookup key that matches
        //      `pcs.code` in the BE.
        //   2. pc_id / pcid / id — fallback for stickers that only
        //      carry an integer id or a generic id-shaped label.
        //   3. code / qr_code   — last resort. Many sticker generators
        //      ship the same value here AND under pc_code, but some
        //      (see Cyberium tenant) ship a different composite that
        //      does NOT match the BE lookup — so we only consult this
        //      after the per-PC keys are exhausted.
        const labelRaw =
          findKey('pc_code', 'pccode') ??
          findKey('pc_id', 'pcid', 'id') ??
          findKey('code', 'qr_code', 'qrcode');
        const labelStr = String(labelRaw ?? '').trim();
        if (labelStr.length > 0) return { code: labelStr };
      } catch {
        // Malformed JSON — fall through.
      }
    }

    // #1: Plain bare label — anything 1-64 chars that doesn't have
    // structural markers (no `{`, `=`, `://`, etc.). Operators that
    // ship raw labels like "PC-01" or "A28" land here.
    if (
      text.length > 0 &&
      text.length <= 64 &&
      !text.includes('{') &&
      !text.includes('=') &&
      !text.includes(' ') &&
      !text.includes('://')
    ) {
      return { code: text };
    }

    // #4: Lenient extraction — handles partial JSON, comma-separated
    // key/value strings, or querystring fragments. Same field
    // priority as the JSON branch above (pc_code → id → code).
    const pcCodeAny = text.match(
      /pc_?code\s*["']?\s*[:=]\s*["']?([^"',}\s]+)/i,
    );
    if (pcCodeAny?.[1]) {
      const labelStr = String(pcCodeAny[1]).replace(/[",]\s*$/, '').trim();
      if (labelStr.length > 0) return { code: labelStr };
    }
    const idAny = text.match(
      /(?:pc_?id|^id\b|[^a-z0-9_]id)\s*["']?\s*[:=]\s*["']?([^"',}\s]+)/i,
    );
    if (idAny?.[1]) {
      const labelStr = String(idAny[1]).replace(/[",]\s*$/, '').trim();
      if (labelStr.length > 0) return { code: labelStr };
    }
    const codeAny = text.match(
      /(?:qr_?code|code)\s*["']?\s*[:=]\s*["']?([^"',}]+)/i,
    );
    if (codeAny?.[1]) {
      const labelStr = String(codeAny[1]).replace(/[",]\s*$/, '').trim();
      if (labelStr.length > 0) return { code: labelStr };
    }

    return null;
  };

  const submitParsed = useCallback(
    async (parsed: { code: string }) => {
      setSubmitting(true);
      // DEV-only diag: surface the resolved code + current tenant so
      // bench testing can verify the FE is sending the right value to
      // the BE. Stripped from release builds by the __DEV__ gate.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[qr-scan] openByQr submit', {
          code: parsed.code,
          tenantId: currentTenantId,
        });
      }
      try {
        const res = await pcsApi.openByQr({ code: parsed.code });
        if (res.ok) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          router.replace('/active-session');
        } else {
          toast.error(getErrorMessage(new Error('QR code not recognized')));
        }
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[qr-scan] openByQr error', getErrorMessage(e));
        }
        toast.error(getErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [toast, currentTenantId],
  );

  /**
   * Unified scan handler — invoked from the live camera, the gallery
   * picker, and the manual submit button. Centralises parse → submit
   * + error fallback (open the manual sheet pre-filled with the raw
   * payload so the user can fix it).
   */
  const handleScanned = useCallback(
    (raw: string) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[qr-scan] raw payload', raw);
      }
      const parsed = parseQr(raw);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[qr-scan] parsed', parsed);
      }
      if (!parsed) {
        // Manual sheet was retired — failure path now just surfaces
        // the toast and lets the camera retry. The user moves the
        // camera off the sticker (or waits ≥4s for the dedupe
        // window) before another scan kicks in.
        toast.error(t.qrScan.invalidFormat);
        return;
      }
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
        // Explicit single-select — pre-fix the default-true behaviour
        // on newer Expo SDKs let the user pick multiple images and
        // we only consumed the first, which read as "the other picks
        // were ignored" on devices that surface a multi-select UI.
        // We only ever decode one QR, so the picker should match.
        allowsMultipleSelection: false,
      });
      if (picked.canceled) return;
      const uri = picked.assets?.[0]?.uri;
      if (!uri) {
        // Picker returned a non-canceled empty result — rare but
        // happens on some Android Xiaomi/Oneplus devices that
        // pre-generate a URI then fail to materialise the file.
        toast.error(t.qrScan.galleryPickFailed);
        return;
      }
      // Lazy-import the QR decoder so expo-camera's native bridge
      // only registers when the user actually invokes it. Top-level
      // import would crash Expo Go on cold mount.
      const { scanFromURLAsync } = await import('expo-camera');
      // Inner try/catch around the decode call so the catch below
      // doesn't see a Laravel-style English error from expo-camera
      // when the image is in an unsupported codec (HEIC on Android,
      // huge PNGs that OOM the decoder, etc.). Surface "couldn't
      // read this photo" instead.
      let results: { data: string }[] = [];
      try {
        results = (await scanFromURLAsync(uri, ['qr'])) as { data: string }[];
      } catch {
        toast.error(t.qrScan.galleryDecodeFailed);
        return;
      }
      const decoded = results?.[0]?.data;
      if (!decoded) {
        toast.error(t.qrScan.galleryDecodeFailed);
        return;
      }
      handleScanned(decoded);
    } catch (e) {
      // Reached only when the permission helper or picker itself
      // throws (very rare). Show the underlying message so we don't
      // mask a developer-actionable error behind a generic toast.
      toast.error(getErrorMessage(e));
    } finally {
      setGalleryPicking(false);
    }
  }, [noActiveTenant, galleryPicking, submitting, toast, t, handleScanned]);

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
                {/* No-tenant gate CTA — md (44pt) full-width pill
                    sitting inside the gate-card column. Label
                    switches between "Klub tanlash" and "Klubga
                    qo'shilish" depending on whether the user has
                    any joined clubs. */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push(hasClubs ? '/(tabs)/profile' : '/club-join')}
                  accessibilityRole="button"
                  accessibilityLabel={hasClubs ? t.qrScan.pickClubBtn : t.qrScan.joinClubBtn}
                  style={pickClubBtnStyles.btn}
                >
                  <LinearGradient
                    colors={['#3B5BF5', '#8B3DF5']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={pickClubBtnStyles.fill}
                  >
                    <Text
                      style={pickClubBtnStyles.label}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {hasClubs ? t.qrScan.pickClubBtn : t.qrScan.joinClubBtn}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
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
                  // Pause scanning whenever a sheet is open — without
                  // this the camera could fire onBarcodeScanned while
                  // the user is typing in the manual sheet, kicking
                  // off a submit they didn't initiate. The submit
                  // state also pauses (existing) to block re-scans
                  // during BE round-trips.
                  paused={submitting || helpOpen}
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

            {/* Bottom links row — help link only. Pre-fix this also
                exposed a "Ввести код вручную" entry into a manual code
                sheet, but that path encouraged users to retype the
                sticker payload from a visually-truncated input that
                hid the real string. Camera scan + gallery decode are
                the supported entry points; manual typing of a 44-char
                operator JSON is a UX dead-end at the best of times. */}
            <View style={styles.linksRow}>
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

      {/* Help bottom sheet — sibling-layout backdrop + sheet
          (separate backdrop Pressable BEHIND the sheet View, no
          Pressable-wrapping-content antipattern). Three concrete
          steps replace the v1's circular "tap the link to see the
          same subtitle as a toast" anti-pattern. */}
      <Modal
        visible={helpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHelpOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.qrScan.guide}</Text>
              <TouchableOpacity
                onPress={() => setHelpOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
          </View>
        </View>
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
  // Bottom-sheet root — sibling-layout container. Backdrop and
  // sheet are SIBLINGS inside this view, NOT nested. The backdrop
  // is an absolute-fill Pressable behind the sheet so taps on the
  // visible dim area dismiss the modal without intercepting touches
  // inside the sheet itself.
  sheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  // (sheetBackdrop style left unused after the layout fix — the
  // backdrop now uses StyleSheet.absoluteFill inline so the dim
  // covers the full modal regardless of the sheet's height.)
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

// Inline pick-club CTA — md (44pt) pill stretched across the gate
// card. Pre-fix this was a generic <Button size="md" fullWidth />
// — same shape, just inlined so the gate-card column can tune
// without touching the shared component.
const pickClubBtnStyles = StyleSheet.create({
  btn: { height: 44, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});


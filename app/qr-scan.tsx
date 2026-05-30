import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import LightningIcon from '../components/icons/LightningIcon';
import GalleryIcon from '../components/icons/GalleryIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { useDialog } from '../components/common/AppDialog';
import * as pcsApi from '../lib/api/services/pcs';
import { generateIdempotencyKey, getErrorMessage } from '../lib/api/client';
import { useAuth } from '../store/AuthProvider';
import type { ClubMembership } from '../lib/api/types';

/**
 * Lazy-load the embedded camera so `expo-camera`'s native bridge
 * isn't invoked until the user actually opens the Scanner tab.
 */
const QrCameraEmbed = lazy(() => import('../components/qr/QrCameraEmbed'));

type ScanTab = 'myCode' | 'scan';

/**
 * Discriminated result of `parseQr`.
 *
 *   • `pc` — a printed PC sticker. `code` is the tenant-scoped label
 *     (e.g. "PC-01") fed to `openByQr`; `tenantId` is the sticker's
 *     advertised club (null on legacy stickers) used for the
 *     cross-tenant guard.
 *   • `claim` — a Shell login QR (`nexora://claim?cid=<uuid>`).
 *     `claimId` is the one-time Shell claim id fed to `claimPc`.
 */
type ParsedQr =
  | { kind: 'pc'; code: string; tenantId: number | null }
  | { kind: 'claim'; claimId: string };

/**
 * QR / scanner screen — v5 redesign.
 *
 * Layout:
 *   - Club picker chip at the top (operator-set tenant name; tap
 *     opens a bottom sheet to switch when the user is a member at
 *     more than one club).
 *   - Tab bar: "Мой код" (default) | "Сканер".
 *   - "Мой код" — full-screen identity QR encoded with everything
 *     downstream needs (phone, tenant_id, client_id, login). The
 *     cashier can scan the code from this screen to find the
 *     customer in the CP, and a future shell-side scanner can use
 *     the same payload to authenticate the user at the seat.
 *   - "Сканер" — the existing camera-first scanner (v3/v4) for PC
 *     stickers. Permission gate, torch, gallery decode all
 *     preserved.
 *
 * Why a tab split: showing a static QR alongside an active camera
 * preview reads as visual noise on a 6.1" screen, and the user's
 * actual intent for any given visit is one of the two (either
 * "show my code to the cashier" or "scan a PC sticker"). Tabs make
 * the mode explicit and let either view occupy the full screen.
 */
export default function QrScanScreen() {
  const t = useT();
  const toast = useToast();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { user, currentTenantId, clubs, switchClub } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [galleryPicking, setGalleryPicking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ScanTab>('myCode');

  // Per-PC-code Idempotency-Key cache. Opening a PC by QR starts a
  // billable session server-side; the camera fires `onScan` on every
  // decoded frame and the user can re-tap a recognised code, so a slow
  // network could let two opens for the SAME sticker race through. We
  // mint one stable key per distinct code and reuse it for every retry
  // of that code — the BE then de-dups a retried open instead of
  // starting a second session / double-charging. A different sticker
  // (different code) gets its own key. Pre-fix the axios interceptor
  // minted a fresh UUID per POST, defeating the dedup entirely.
  const idempotencyByCodeRef = useRef<{ code: string; key: string } | null>(null);

  // Same dedup intent for the Shell-claim path: one stable key per
  // distinct claim id so a re-tap / flaky-network retry of the same
  // login QR binds the client once, not twice.
  const claimIdempotencyRef = useRef<{ claimId: string; key: string } | null>(null);

  const noActiveTenant = !currentTenantId;
  const hasClubs = (clubs?.length ?? 0) > 0;

  // Dedupe by tenant_id defensively — the BE can return two rows
  // for the same tenant (operator pre-onboarded slot + user's
  // self-registered row), and we don't want the picker rendering
  // duplicate entries (React warns about non-unique keys). Once the
  // BE dedup fix lands this becomes a no-op; keep the FE guard so
  // a regression on either side doesn't bleed into the UI.
  const uniqueClubs = useMemo(() => {
    const seen = new Set<number>();
    const out: ClubMembership[] = [];
    for (const c of clubs) {
      if (seen.has(c.tenant_id)) continue;
      seen.add(c.tenant_id);
      out.push(c);
    }
    return out;
  }, [clubs]);

  const currentClub = useMemo(
    () => uniqueClubs.find((c) => c.tenant_id === currentTenantId) ?? null,
    [uniqueClubs, currentTenantId],
  );

  /**
   * Identity QR payload — encodes everything a future cashier
   * scanner or shell-side scanner needs to identify the user at
   * this specific club. URL form keeps the payload short enough
   * for a 21×21 QR to stay scannable from a phone screen.
   *
   * The contract is intentionally permissive: tenant_id + client_id
   * are sufficient for a CP lookup; login + phone are extras for
   * fallback identification (operator searches by phone if their
   * scanner is offline, etc.).
   */
  const myQrPayload = useMemo(() => {
    if (!currentClub) return '';
    const params = new URLSearchParams();
    params.set('v', '1');
    params.set('tenant_id', String(currentClub.tenant_id));
    if (currentClub.client_id != null) {
      params.set('client_id', String(currentClub.client_id));
    }
    if (currentClub.login) {
      params.set('login', String(currentClub.login));
    }
    if (user?.phone) {
      params.set('phone', String(user.phone));
    }
    return `nx://identify?${params.toString()}`;
  }, [currentClub, user]);

  // Parse helper preserved from the previous revision — pulled into
  // a stable callback so the Suspense boundary doesn't see its
  // identity change on every render.
  //
  // The parser returns a discriminated union so `handleScanned` can
  // branch on the QR's intent:
  //   • `{ kind: 'claim', claimId }` — a Shell login QR
  //     (`nexora://claim?cid=<uuid>`). The signed-in client claims the
  //     seat's pending Shell session; no billable open happens here.
  //   • `{ kind: 'pc', code, tenantId }` — a printed PC sticker (URL,
  //     JSON, or bare code form). Opens the PC and starts a session.
  //
  // SEC: the `pc` branch surfaces a `tenantId` when the sticker /
  // payload carries one. `myQrPayload` above mints stickers with a
  // `tenant_id` param, but the scan side used to drop it and pass only
  // the raw `code` to `openByQr`. Because the tenant is implied by the
  // caller's `client_token`, scanning club B's sticker while logged in
  // at club A would open *club A's* "PC-01" (both clubs can have one) —
  // silently billing the wrong club. `handleScanned` now compares this
  // `tenantId` against `currentTenantId` and refuses the cross-tenant
  // open. Legacy stickers without a tenant stay backward-compatible
  // (`tenantId` is null → no comparison, open as before).
  const parseQr = useCallback(
    (raw: string): ParsedQr | null => {
      let text = raw.trim();
      if (!text) return null;
      if (
        (text.startsWith("'") && text.endsWith("'")) ||
        (text.startsWith('"') && text.endsWith('"'))
      ) {
        text = text.slice(1, -1).trim();
      }
      // Coerce a raw param/field value into a positive integer tenant id;
      // anything non-numeric or <= 0 is treated as absent.
      const toTenantId = (v: unknown): number | null => {
        if (v == null) return null;
        const n = Number(String(v).trim());
        return Number.isInteger(n) && n > 0 ? n : null;
      };

      // Shell login QR — `nexora://claim?cid=<uuid>`. Matched before
      // the generic URL branch: Hermes' `URL` parses custom schemes but
      // exposes the query inconsistently for non-http(s) URIs, so we
      // pull `cid` ourselves with a scheme-anchored regex instead of
      // trusting `searchParams`. Case-insensitive on the scheme/host;
      // `cid` is the only field the preview payload carries today.
      const claimMatch = text.match(/^nexora:\/\/claim\b[^]*?[?&]cid=([^&\s]+)/i);
      if (claimMatch?.[1]) {
        // Decode percent-escapes defensively; reject an empty result.
        let claimId = claimMatch[1].trim();
        try {
          claimId = decodeURIComponent(claimId);
        } catch {
          // Leave the raw value if it isn't valid percent-encoding.
        }
        if (claimId) return { kind: 'claim', claimId };
        return null;
      }

      try {
        const u = new URL(text);
        const codeParam = u.searchParams.get('code') ?? u.searchParams.get('id');
        const tenantId = toTenantId(u.searchParams.get('tenant_id'));
        if (codeParam) return { kind: 'pc', code: codeParam, tenantId };
      } catch {
        // Not a URL — fall through.
      }
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonCandidate = text.slice(jsonStart, jsonEnd + 1);
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
          const labelRaw =
            findKey('pc_code', 'pccode') ??
            findKey('pc_id', 'pcid', 'id') ??
            findKey('code', 'qr_code', 'qrcode');
          const tenantId = toTenantId(findKey('tenant_id', 'tenantid'));
          const labelStr = String(labelRaw ?? '').trim();
          if (labelStr.length > 0) return { kind: 'pc', code: labelStr, tenantId };
        } catch {
          // Malformed JSON — fall through.
        }
      }
      if (
        text.length > 0 &&
        text.length <= 64 &&
        !text.includes('{') &&
        !text.includes('=') &&
        !text.includes(' ') &&
        !text.includes('://')
      ) {
        return { kind: 'pc', code: text, tenantId: null };
      }
      const lenientMatch =
        text.match(/(?:^|[,;&\s])id\s*=\s*([^\s,;&"']+)/i) ??
        text.match(/['"]id['"]\s*:\s*['"]([^'"]+)['"]/i) ??
        text.match(/['"]code['"]\s*:\s*['"]([^'"]+)['"]/i);
      if (lenientMatch?.[1]) return { kind: 'pc', code: lenientMatch[1].trim(), tenantId: null };
      return null;
    },
    [],
  );

  const handleScanned = useCallback(
    async (raw: string) => {
      if (noActiveTenant) {
        toast.error(t.qrScan.noTenantToast);
        return;
      }
      const parsed = parseQr(raw);
      if (!parsed) {
        toast.error(t.qrScan.invalidFormat);
        return;
      }
      if (submitting) return;

      // Shell login QR — bind this signed-in client to the seat's
      // pending Shell session, then tell the user to look at the screen
      // (the Shell polls the claim id and logs them in). No billable
      // open and no cross-tenant guard: the bind is resolved against the
      // active `client_token`'s tenant on the BE; a claim id from a
      // different club simply won't match and comes back `not_found`.
      if (parsed.kind === 'claim') {
        setSubmitting(true);
        try {
          // Reuse one key per distinct claim id so a re-tap / retry of
          // the same scan can't register two binds.
          const cached = claimIdempotencyRef.current;
          const idempotencyKey =
            cached && cached.claimId === parsed.claimId
              ? cached.key
              : generateIdempotencyKey();
          claimIdempotencyRef.current = { claimId: parsed.claimId, key: idempotencyKey };

          await pcsApi.claimPc(parsed.claimId, idempotencyKey);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
          await dialog.alert({
            title: t.qrScan.headerTitle,
            message: t.qrScan.qrClaimSuccess,
            confirmLabel: t.common.ok,
            variant: 'success',
          });
          router.back();
        } catch (e) {
          // Map the BE's `expired` signal to specific copy; everything
          // else (`not_found`, network, malformed) falls back to the
          // generic claim error.
          const beMessage = getErrorMessage(e).toLowerCase();
          const message = beMessage.includes('expir')
            ? t.qrScan.qrClaimExpired
            : t.qrScan.qrClaimError;
          await dialog.alert({
            title: t.qrScan.headerTitle,
            message,
            confirmLabel: t.common.ok,
            variant: 'warning',
          });
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // SEC: cross-tenant guard. `openByQr` resolves the PC inside the
      // tenant tied to the active `client_token`, so a `code` collision
      // across clubs (every club tends to have a "PC-01") would open the
      // *wrong* club's seat and bill there. When the sticker advertises
      // its `tenant_id`, refuse any open whose tenant differs from the
      // active one. If the user is actually a member of the scanned
      // club, offer to switch into it and continue; otherwise it's a
      // sticker from a club they don't belong to — hard stop. Legacy
      // stickers (`tenantId === null`) keep the old behaviour.
      if (parsed.tenantId != null && parsed.tenantId !== currentTenantId) {
        const targetClub = uniqueClubs.find((c) => c.tenant_id === parsed.tenantId);
        if (targetClub) {
          const switchOk = await dialog.confirm({
            title: t.qrScan.wrongClubTitle,
            message: t.qrScan.wrongClubSwitch.replace('{club}', targetClub.tenant_name),
            confirmLabel: t.qrScan.wrongClubSwitchCta,
            cancelLabel: t.common.cancel,
            variant: 'warning',
          });
          if (!switchOk) return;
          try {
            await switchClub(parsed.tenantId);
          } catch (e) {
            toast.error(getErrorMessage(e));
            return;
          }
        } else {
          await dialog.alert({
            title: t.qrScan.wrongClubTitle,
            message: t.qrScan.wrongClubNotMember,
            confirmLabel: t.common.ok,
            variant: 'warning',
          });
          return;
        }
      }

      setSubmitting(true);
      try {
        // Reuse the key for this exact code across retries; mint a
        // fresh one only when a different sticker is scanned.
        const cached = idempotencyByCodeRef.current;
        const idempotencyKey =
          cached && cached.code === parsed.code
            ? cached.key
            : generateIdempotencyKey();
        idempotencyByCodeRef.current = { code: parsed.code, key: idempotencyKey };

        await pcsApi.openByQr({ code: parsed.code }, idempotencyKey);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        router.replace('/active-session');
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [noActiveTenant, parseQr, submitting, currentTenantId, uniqueClubs, dialog, switchClub, t, toast],
  );

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
        allowsMultipleSelection: false,
      });
      if (picked.canceled) return;
      const uri = picked.assets?.[0]?.uri;
      if (!uri) {
        toast.error(t.qrScan.galleryPickFailed);
        return;
      }
      const { scanFromURLAsync } = await import('expo-camera');
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
      toast.error(getErrorMessage(e));
    } finally {
      setGalleryPicking(false);
    }
  }, [noActiveTenant, galleryPicking, submitting, toast, t, handleScanned]);

  const onPickClub = useCallback(
    async (tenantId: number) => {
      setClubPickerOpen(false);
      if (tenantId === currentTenantId) return;
      try {
        await switchClub(tenantId);
      } catch (e) {
        toast.error(getErrorMessage(e));
      }
    },
    [currentTenantId, switchClub, toast],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.qrScan.headerTitle} />

      {noActiveTenant ? (
        <View style={styles.gateWrap}>
          <View style={styles.gateCard}>
            <Text style={styles.gateTitle}>{t.qrScan.noTenantTitle}</Text>
            <Text style={styles.gateSub}>
              {hasClubs ? t.qrScan.noTenantHasClubs : t.qrScan.noTenantNoClubs}
            </Text>
            <View style={styles.gateBtnWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(hasClubs ? '/(tabs)/profile' : '/(tabs)/discover')}
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
          {/* Club picker chip — current tenant name + chevron. Tap
              opens the bottom-sheet picker so multi-club users can
              switch without leaving the scanner screen. */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={styles.clubChip}
              activeOpacity={0.7}
              onPress={() => setClubPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t.qrScan.changeClubA11y}
            >
              <Text style={styles.clubChipLabel} numberOfLines={1}>
                {currentClub?.tenant_name ?? t.qrScan.headerTitle}
              </Text>
              <Text style={styles.clubChipChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar — "Мой код" / "Сканер" */}
          <View style={styles.tabBar}>
            <TabButton
              label={t.qrScan.tabMyCode}
              active={activeTab === 'myCode'}
              onPress={() => setActiveTab('myCode')}
            />
            <TabButton
              label={t.qrScan.tabScan}
              active={activeTab === 'scan'}
              onPress={() => setActiveTab('scan')}
            />
          </View>

          <View style={styles.body}>
            {activeTab === 'myCode' ? (
              <MyCodeView
                payload={myQrPayload}
                clubName={currentClub?.tenant_name ?? ''}
                login={currentClub?.login ?? ''}
                phone={user?.phone ?? null}
                t={t}
              />
            ) : (
              <ScannerView
                torchOn={torchOn}
                onToggleTorch={() => setTorchOn((v) => !v)}
                onPickFromGallery={onPickFromGallery}
                galleryPicking={galleryPicking}
                submitting={submitting}
                helpOpen={helpOpen}
                onOpenHelp={() => setHelpOpen(true)}
                onCameraScan={onCameraScan}
                t={t}
              />
            )}
          </View>
        </>
      )}

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
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.qrScan.guide}</Text>
              <TouchableOpacity
                onPress={() => setHelpOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t.common.cancel}
              >
                <Text style={styles.sheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetStep}>1. {t.qrScan.helpStep1}</Text>
            <Text style={styles.sheetStep}>2. {t.qrScan.helpStep2}</Text>
            <Text style={styles.sheetStep}>3. {t.qrScan.helpStep3}</Text>
          </View>
        </View>
      </Modal>

      <ClubPickerSheet
        visible={clubPickerOpen}
        clubs={uniqueClubs}
        currentTenantId={currentTenantId}
        onClose={() => setClubPickerOpen(false)}
        onPick={onPickClub}
        t={t}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Subviews
// ──────────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface MyCodeViewProps {
  payload: string;
  clubName: string;
  login: string;
  phone: string | null;
  t: ReturnType<typeof useT>;
}

function MyCodeView({ payload, clubName, login, phone, t }: MyCodeViewProps) {
  return (
    <View style={styles.myCodeWrap}>
      <Text style={styles.myCodeTitle}>{t.qrScan.myCodeTitle}</Text>
      <Text style={styles.myCodeSub}>
        {t.qrScan.myCodeSub.replace('{club}', clubName)}
      </Text>

      <View style={styles.qrCard}>
        {payload ? (
          <QRCode
            value={payload}
            size={220}
            color="#0B0F16"
            backgroundColor="#FFFFFF"
            quietZone={8}
          />
        ) : (
          <ActivityIndicator color={Colors.primary} />
        )}
      </View>

      <View style={styles.myCodeMeta}>
        {!!login && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t.qrScan.myCodeLoginLabel}</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {login}
            </Text>
          </View>
        )}
        {!!phone && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t.qrScan.myCodePhoneLabel}</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {prettifyPhone(phone)}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.myCodeHint}>{t.qrScan.myCodeHint}</Text>
    </View>
  );
}

interface ScannerViewProps {
  torchOn: boolean;
  onToggleTorch: () => void;
  onPickFromGallery: () => void;
  galleryPicking: boolean;
  submitting: boolean;
  helpOpen: boolean;
  onOpenHelp: () => void;
  onCameraScan: (raw: string) => void;
  t: ReturnType<typeof useT>;
}

function ScannerView({
  torchOn,
  onToggleTorch,
  onPickFromGallery,
  galleryPicking,
  submitting,
  helpOpen,
  onOpenHelp,
  onCameraScan,
  t,
}: ScannerViewProps) {
  return (
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
            paused={submitting || helpOpen}
          />
        </Suspense>

        {submitting && (
          <View style={styles.submittingVeil} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={styles.submittingText}>{t.qrScan.submittingHint}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, torchOn && styles.actionBtnOn]}
          onPress={onToggleTorch}
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

      <View style={styles.linksRow}>
        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.7}
          onPress={onOpenHelp}
          accessibilityRole="button"
          accessibilityLabel={t.qrScan.guide}
        >
          <Text style={styles.linkText}>{t.qrScan.guide}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

interface ClubPickerSheetProps {
  visible: boolean;
  clubs: ClubMembership[];
  currentTenantId: number | null;
  onClose: () => void;
  onPick: (tenantId: number) => void;
  t: ReturnType<typeof useT>;
}

function ClubPickerSheet({
  visible,
  clubs,
  currentTenantId,
  onClose,
  onPick,
  t,
}: ClubPickerSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t.qrScan.changeClubTitle}</Text>
          {clubs.map((club) => {
            const active = club.tenant_id === currentTenantId;
            return (
              <TouchableOpacity
                key={club.tenant_id}
                style={[styles.clubRow, active && styles.clubRowActive]}
                onPress={() => onPick(club.tenant_id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.clubRowText, active && styles.clubRowTextActive]}
                  numberOfLines={1}
                >
                  {club.tenant_name}
                </Text>
                {active && <Text style={styles.clubRowCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────

/** Pretty Uzbek phone: "998901234567" → "+998 90 123 45 67". */
function prettifyPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 12 || !digits.startsWith('998')) return raw;
  return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
}

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },

  // Gate / no-active-tenant
  gateWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 32, alignItems: 'center' },
  gateCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gateTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  gateSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  gateBtnWrap: { alignSelf: 'stretch' },

  // Club chip
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  clubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    maxWidth: '90%',
  },
  clubChipLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
    maxWidth: 220,
  },
  clubChipChevron: {
    fontSize: 14,
    color: '#00CFFF',
    marginLeft: 2,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  tabLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#8B95A8',
  },
  tabLabelActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },

  // My code view
  myCodeWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  myCodeTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  myCodeSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 252,
    height: 252,
    marginBottom: 18,
  },
  myCodeMeta: {
    width: '100%',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  metaValue: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'right',
  },
  myCodeHint: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
    lineHeight: 17,
  },

  // Scanner view (preserved from v4)
  cameraWrap: { flex: 1, marginHorizontal: 16, marginTop: 6, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0B0F16' },
  cameraFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submittingVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submittingText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtnOn: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionTextOn: { color: '#0B0F16' },
  linksRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: 'center',
  },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  linkText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#00CFFF',
  },

  // Bottom sheet (shared between help + club picker)
  sheetRoot: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
  },
  sheetClose: {
    fontSize: 18,
    color: '#8B95A8',
    paddingHorizontal: 4,
  },
  sheetStep: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13.5,
    color: '#C7CAD1',
    lineHeight: 20,
    marginBottom: 10,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  clubRowActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.3)',
  },
  clubRowText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  clubRowTextActive: { color: '#00CFFF' },
  clubRowCheck: {
    fontSize: 16,
    color: '#00CFFF',
    marginLeft: 10,
  },
});

const pickClubBtnStyles = StyleSheet.create({
  btn: { height: 44, borderRadius: 999, overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});

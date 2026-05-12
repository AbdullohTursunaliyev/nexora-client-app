import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  AppState,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  /**
   * Fires once with the raw decoded QR string. The host screen owns
   * parsing / submission / navigation — this component just decodes
   * and hands the payload back.
   *
   * `paused` lets the host re-arm scanning after a failed submit
   * (we set `handledRef` to false when `paused` flips back to false).
   */
  onScan: (raw: string) => void;
  /** External torch toggle controlled by the parent's flash button. */
  torchOn?: boolean;
  /**
   * When true the camera component blocks barcode callbacks. Used
   * by the parent while a submission is in flight, so a re-detection
   * burst doesn't fire onScan again after a successful scan.
   */
  paused?: boolean;
}

/**
 * Embedded QR-camera view — replaces the modal-based scanner for
 * the main `/qr-scan` screen.
 *
 * Why embedded instead of modal-only:
 *   Every well-rated mobile QR flow (WhatsApp / Telegram / Revolut /
 *   PayPal / Sberbank) shows the live camera AS the primary visual
 *   on the scan screen — not a "tap to open camera" placeholder.
 *   Putting the camera behind a button adds an extra tap and breaks
 *   the user's mental model ("the screen for scanning QR codes" vs
 *   "the screen for launching the screen for scanning QR codes").
 *
 * Architecture notes:
 *   - Lazy-loadable via React.lazy on the host side. Importing
 *     `expo-camera` at module-load time would crash Expo Go on
 *     cold start before the user navigates anywhere; deferring the
 *     import until the user actually reaches /qr-scan side-steps
 *     that.
 *   - Permission gate renders inline (no separate "you need
 *     permission" screen). Three states: not-determined (spinner),
 *     denied (request CTA), granted (live camera).
 *   - AppState listener pauses scanning when the app backgrounds —
 *     without it iOS sometimes fires a stale `onBarcodeScanned` the
 *     instant the camera resumes, navigating the user mid-foreground
 *     with no input.
 */
export default function QrCameraEmbed({ onScan, torchOn = false, paused = false }: Props) {
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // Guard so a barcode-detection burst doesn't fire onScan multiple
  // times in a row. The camera fires the callback continuously while
  // the QR is in frame; the first hit is the one we want.
  const handledRef = useRef(false);

  // Re-arm scanning whenever the host pauses then unpauses (e.g. a
  // submit failed and the user wants to scan again).
  useEffect(() => {
    if (!paused) {
      handledRef.current = false;
    }
  }, [paused]);

  // Pause when app goes to background so a stale frame doesn't
  // re-trigger onScan when the user comes back to the screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
      if (next !== 'active') {
        handledRef.current = true; // pause
      } else {
        handledRef.current = false; // re-arm
      }
    });
    return () => sub.remove();
  }, []);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (handledRef.current || paused) return;
      const raw = String(result?.data ?? '').trim();
      if (!raw) return;
      handledRef.current = true;
      onScan(raw);
    },
    [onScan, paused],
  );

  // Permission still loading on first mount — show a quiet spinner
  // inside the viewfinder frame so the screen doesn't flash empty.
  if (!permission) {
    return (
      <View style={styles.frame}>
        <View style={styles.cornerOverlay} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00CFFF" />
        </View>
      </View>
    );
  }

  // Permission denied — embed the request CTA inside the frame so
  // the layout below (hint, actions, manual entry link) doesn't
  // shift when the user grants permission.
  if (!permission.granted) {
    return (
      <View style={styles.frame}>
        <View style={styles.cornerOverlay} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.permBox}>
          <Text style={styles.permTitle}>{t.qrScan.cameraPermTitle}</Text>
          <Text style={styles.permSub}>{t.qrScan.cameraPermSub}</Text>
          <TouchableOpacity
            style={styles.permBtn}
            activeOpacity={0.85}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel={t.qrScan.cameraPermCta}
          >
            <Text style={styles.permBtnText}>{t.qrScan.cameraPermCta}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      {appActive && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          // Restrict to QR — anything else (EAN/UPC) would be a false
          // positive for our flow.
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />
      )}

      {/* Viewfinder overlay — 4 gradient corners. `pointerEvents: none`
          so the corners don't intercept touches that should reach
          the camera. */}
      <View style={styles.cornerOverlay} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Hint text at the bottom of the frame — same place
          professional camera-first scanners (Telegram, Revolut)
          place their instruction copy. */}
      <View style={styles.hintWrap} pointerEvents="none">
        <Text style={styles.hintText}>{t.qrScan.alignHint}</Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 32;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  // Outer container — square aspect ratio enforced by the host's
  // sizing. Black background covers any sliver of safe-area while
  // the camera initialises.
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  cornerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#00CFFF',
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#7C3AED',
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#7C3AED',
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#FF34E0',
    borderBottomRightRadius: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Permission gate inside the frame — keeps the layout stable
  // (the host's actions / manual link don't jump when permission
  // is granted and the camera replaces this box).
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: '#0B0F16',
  },
  permTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.text,
    textAlign: 'center',
  },
  permSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  permBtn: {
    marginTop: 8,
    backgroundColor: '#00CFFF',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  permBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#0B0F16',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

// Suppress unused-Platform warning — keep import for future
// platform-conditional CameraView props (e.g. iOS-only ZoomFactor).
void Platform;

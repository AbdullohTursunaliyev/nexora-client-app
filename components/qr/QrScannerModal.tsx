import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CameraView,
  useCameraPermissions,
  scanFromURLAsync,
  type BarcodeScanningResult,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import LightningIcon from '../icons/LightningIcon';
import GalleryIcon from '../icons/GalleryIcon';
import CloseIcon from '../icons/CloseIcon';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useToast } from '../common/Toast';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Fires once with the raw decoded QR string (from live scan OR
   * gallery pick). The host screen is responsible for parsing /
   * validating / submitting — the modal just hands off the payload
   * and closes.
   */
  onScan: (raw: string) => void;
}

/**
 * Fullscreen modal that opens the device camera, scans QR codes,
 * and reports the decoded payload back to the parent screen. Used by
 * `qr-scan.tsx` and could be reused anywhere QR pickup is needed
 * (e.g. club-join, future event check-ins).
 *
 * Features:
 *   • Live camera preview with a square viewfinder overlay (cyan/purple
 *     gradient corners — matches the brand QR design).
 *   • Flash toggle (front-camera devices fall back to no-op).
 *   • Gallery fallback: pick a saved photo and decode the QR via
 *     `Camera.scanFromURLAsync` — useful when a QR is on a screen the
 *     user can't physically point a camera at.
 *   • Permission gate: shows a "grant access" CTA when the OS
 *     declined. Settings deep-link is the only way back from a
 *     hard-denied state on iOS, so we surface that path.
 *
 * Lifecycle: the modal only mounts (and the camera only starts) when
 * `visible` is true. Closing it tears down the camera so it doesn't
 * keep the lens claimed in the background.
 */
export default function QrScannerModal({ visible, onClose, onScan }: QrScannerModalProps) {
  const t = useT();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [picking, setPicking] = useState(false);
  // Guard so a barcode-detection burst doesn't fire onScan multiple
  // times in a row. The camera fires the callback continuously while
  // the QR is in frame; the first hit is the one we want.
  const handledRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      // Reset so the next open re-arms scanning.
      handledRef.current = false;
      setTorchOn(false);
    }
  }, [visible]);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (handledRef.current) return;
      const raw = String(result?.data ?? '').trim();
      if (!raw) return;
      handledRef.current = true;
      onScan(raw);
      onClose();
    },
    [onScan, onClose],
  );

  const onPickFromGallery = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.error(t.qrScan.galleryDenied);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        // expo-image-picker v17: `MediaTypeOptions.Images` is
        // deprecated in favour of an array of literal media types.
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        toast.error(t.qrScan.galleryDecodeFailed);
        return;
      }
      // `scanFromURLAsync` reads the image, runs barcode detection,
      // and returns an array of hits. We restrict to QR for the
      // mobile use case but the API accepts other codes (EAN, etc.).
      const hits = await scanFromURLAsync(uri, ['qr']);
      const decoded = String(hits?.[0]?.data ?? '').trim();
      if (!decoded) {
        toast.error(t.qrScan.galleryDecodeFailed);
        return;
      }
      onScan(decoded);
      onClose();
    } catch {
      toast.error(t.qrScan.galleryDecodeFailed);
    } finally {
      setPicking(false);
    }
  }, [picking, toast, t, onScan, onClose]);

  const renderBody = () => {
    if (!permission) {
      // Permissions still loading on first open. Show a spinner so the
      // user knows the OS prompt is on its way.
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00CFFF" />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.permTitle}>{t.qrScan.cameraPermTitle}</Text>
          <Text style={styles.permSub}>{t.qrScan.cameraPermSub}</Text>
          <TouchableOpacity
            style={styles.permBtn}
            activeOpacity={0.85}
            onPress={async () => {
              const res = await requestPermission();
              if (!res.granted) {
                toast.error(t.qrScan.cameraDenied);
              }
            }}
          >
            <Text style={styles.permBtnText}>{t.qrScan.cameraPermCta}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          // Restrict to QR — anything else (EAN/UPC) would be a false
          // positive for our flow.
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />

        {/* Viewfinder overlay: 4 gradient corners centred on the
            screen. The cutout itself isn't a real hole — the camera
            scans the whole frame regardless — but it gives the user
            a target zone to align the QR against. */}
        <View style={styles.overlayDim} pointerEvents="none">
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hintText}>{t.qrScan.alignHint}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            hitSlop={8}
          >
            <CloseIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.qrScan.headerTitle}</Text>
          <View style={styles.iconBtnSpacer} />
        </View>

        {renderBody()}

        {permission?.granted && (
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.action, torchOn && styles.actionOn]}
              onPress={() => setTorchOn((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t.qrScan.actionFlash}
            >
              <LightningIcon size={18} color={torchOn ? '#0B0F16' : '#F59E0B'} />
              <Text style={[styles.actionText, torchOn && styles.actionTextOn]}>
                {t.qrScan.actionFlash}
              </Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={onPickFromGallery}
              disabled={picking}
              accessibilityRole="button"
              accessibilityLabel={t.qrScan.actionGallery}
            >
              {picking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <GalleryIcon size={18} color="#FFFFFF" />
              )}
              <Text style={styles.actionText}>{t.qrScan.actionGallery}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  permSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
  },
  permBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#00CFFF',
  },
  permBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#0B0F16',
  },
  cameraWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00CFFF',
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#7C3AED',
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#7C3AED',
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FF34E0',
    borderBottomRightRadius: 14,
  },
  hintText: {
    position: 'absolute',
    bottom: 80,
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  action: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionOn: {
    backgroundColor: '#F59E0B',
  },
  actionText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  actionTextOn: {
    color: '#0B0F16',
  },
});

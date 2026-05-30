import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import UserAvatar from '../components/common/UserAvatar';
import { useAuth } from '../store/AuthProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import AuthGate from '../components/common/AuthGate';
import * as authApi from '../lib/api/services/auth';

// BE caps these at 64 chars (see MobileAuthController::saveProfile
// validator). Surfacing the cap on the FE means we 422 the
// over-long input on submit BEFORE the request flies — better than
// hitting the BE and getting a generic toast back.
const NAME_MAX_LENGTH = 64;
const PHONE_MAX_LENGTH = 32;
const BIRTH_DATE_MAX_LENGTH = 10;

// Avatar upload constraints — MUST match the BE validator in
// MobileAuthController::uploadAvatar:
//   mimes:jpg,jpeg,png,webp · max:5120 KB · 64x64 .. 2000x2000 px
// Mirroring them on the FE lets us reject obviously-bad picks
// BEFORE the upload round-trip and surface a precise reason
// ("file too large", "format unsupported") instead of a generic
// "couldn't upload" after a multi-MB POST.
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIN_DIMENSION = 64;
const AVATAR_MAX_DIMENSION = 2000;
const AVATAR_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export default function ProfileEditScreen() {
  return (
    <AuthGate>
      <ProfileEditInner />
    </AuthGate>
  );
}

function ProfileEditInner() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { user, saveProfile, refreshMe } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /**
   * Translate a generic upload error into a precise, user-readable
   * toast. Reads the raw error message (which `getErrorMessage`
   * pulls from the Laravel 422 validator) and matches against the
   * substrings Laravel uses for each rule failure on the
   * `avatar` field. Falls back to the generic "couldn't upload"
   * toast when nothing matches — better to be vague than wrong.
   *
   * Pre-fix every upload failure surfaced the raw Laravel string
   * (English, technical, e.g. "The avatar field must not be greater
   * than 5120 kilobytes"). The user couldn't act on it because:
   *   - The text was English on a UZ/RU-locale phone
   *   - "5120 kilobytes" isn't intuitive ("oh, 5 MB!" is)
   *   - It didn't tell them WHAT to do next ("resize and retry")
   * Now each known failure has a localised, actionable line.
   */
  const mapAvatarUploadError = (error: unknown): string => {
    const raw = getErrorMessage(error).toLowerCase();
    // Order matters — check the most specific patterns first. Some
    // BE messages overlap (e.g. "image" appears in both
    // "must be an image" and "image dimensions") so we want the
    // more-specific dimensions match BEFORE the generic image one.
    if (raw.includes('kilobyte') || raw.includes('too large') || raw.includes('size')) {
      return t.profileEdit.avatarTooLarge;
    }
    if (
      raw.includes('dimension') ||
      raw.includes('width') ||
      raw.includes('height') ||
      raw.includes('pixels')
    ) {
      return t.profileEdit.avatarBadDimensions;
    }
    if (
      raw.includes('mimes') ||
      raw.includes('file of type') ||
      raw.includes('must be an image') ||
      raw.includes('not a valid image') ||
      raw.includes('image')
    ) {
      return t.profileEdit.avatarBadFormat;
    }
    if (raw.includes('network') || raw.includes('timeout') || raw.includes('econ')) {
      return t.profileEdit.avatarNetworkError;
    }
    if (raw.includes('server') || raw.includes('500') || raw.includes('503')) {
      return t.profileEdit.avatarServerError;
    }
    // Unknown shape — return the generic "couldn't upload" rather
    // than the raw English Laravel string, which the user can't act on.
    return t.profileEdit.avatarUploadFailed;
  };

  /**
   * Native avatar picker — opens the OS gallery, lets the user crop
   * to a square, then uploads the result to the BE. The BE returns
   * the public URL of the stored avatar which we patch into the form
   * state; saving the profile then persists it like a manually-pasted
   * URL would.
   *
   * Permission is requested via expo-image-picker's own helper which
   * pre-pops the OS dialog. On denial we show a toast — no settings
   * deep-link because the user can still paste a URL into the input
   * below.
   *
   * Pre-check gauntlet: BEFORE the upload POST, the asset metadata
   * (size/mime/dimensions) is matched against the BE's validator
   * rules. Rejecting locally saves the user a multi-second
   * upload-then-fail cycle and surfaces a clearer "your photo is too
   * big" instead of a generic 422 toast.
   */
  const onPickAvatar = async () => {
    if (uploadingAvatar) return;
    // Light haptic on tap so the avatar actually feels tappable.
    // Pre-fix the tap had no feedback (no ripple on Android, no
    // visual ack on iOS) and users reported the picker felt
    // "stuck" because they couldn't tell their tap registered.
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.error(t.profileEdit.galleryDenied);
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        // expo-image-picker v17: `MediaTypeOptions.Images` is
        // deprecated — use literal-array form.
        mediaTypes: ['images'],
        allowsEditing: true,
        // Square crop matches the avatar mask we render everywhere.
        aspect: [1, 1],
        // 0.85 trims ~30% of file size with no visible artefact at
        // the 88pt size we render at. Saves the BE upload route from
        // multi-MB files when the user picks a fresh phone-camera shot.
        quality: 0.85,
        // Explicit single-select — same fix as the qr-scan gallery
        // picker. Some Expo SDK versions default to multi-select on
        // Android, which would let the user pick multiple images
        // even though we only ever upload one.
        allowsMultipleSelection: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset?.uri) return;

      // ── Pre-checks (mirror the BE validator) ──
      // 1) File size — BE max is 5120 KB. `fileSize` is in BYTES on
      //    expo-image-picker. Field is undefined on some Android
      //    devices that don't report file size for content-URIs; we
      //    skip the check there and let the BE catch it.
      if (typeof asset.fileSize === 'number' && asset.fileSize > AVATAR_MAX_BYTES) {
        const actualMb = (asset.fileSize / 1024 / 1024).toFixed(1);
        toast.error(
          t.profileEdit.avatarTooLargeWithSize
            .replace('{size}', actualMb)
            .replace('{max}', String(AVATAR_MAX_BYTES / 1024 / 1024)),
        );
        return;
      }

      // 2) Mime type — BE accepts jpg/jpeg/png/webp only. HEIC (iOS
      //    Live Photos default) is the common rejection — we surface
      //    a clear "convert to JPG" hint via the i18n string.
      const mimeType = (asset.mimeType ?? 'image/jpeg').toLowerCase();
      if (!AVATAR_ALLOWED_MIME.has(mimeType)) {
        toast.error(t.profileEdit.avatarBadFormat);
        return;
      }

      // 3) Dimensions — BE requires 64..2000 on each axis. The crop
      //    UI lets the user choose any region of any size, including
      //    something smaller than 64x64 if their source is a tiny
      //    thumbnail. Width/height are reported as numbers when the
      //    picker decoded the image successfully.
      if (typeof asset.width === 'number' && typeof asset.height === 'number') {
        if (asset.width < AVATAR_MIN_DIMENSION || asset.height < AVATAR_MIN_DIMENSION) {
          toast.error(
            t.profileEdit.avatarTooSmallWithDims.replace('{min}', String(AVATAR_MIN_DIMENSION)),
          );
          return;
        }
        if (asset.width > AVATAR_MAX_DIMENSION || asset.height > AVATAR_MAX_DIMENSION) {
          toast.error(
            t.profileEdit.avatarTooBigDimsWithDims.replace(
              '{max}',
              String(AVATAR_MAX_DIMENSION),
            ),
          );
          return;
        }
      }

      setUploadingAvatar(true);
      // Derive filename + mime from the asset metadata when available;
      // fall back to JPEG (the most common phone-camera output).
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;

      const result = await authApi.uploadAvatar({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });
      const newUrl = result.url ?? result.user?.avatar_url ?? '';
      if (!newUrl) {
        toast.error(t.profileEdit.avatarUploadFailed);
        return;
      }
      setAvatarUrl(newUrl);
      // Push the new avatar into AuthProvider's `user` so the home
      // header + profile tab show it immediately. Pre-fix this only
      // updated local component state — if the user backed out
      // without tapping Save, the rest of the app kept rendering
      // the stale avatar until the next refreshMe() (typically a
      // cold app restart). Audit finding H2.
      // Fire-and-forget: failures here don't roll back the upload
      // (the BE already has the new avatar) and the next focus
      // will reconcile.
      refreshMe().catch(() => {});
      toast.success(t.profileEdit.avatarUploadedToast);
    } catch (e) {
      // mapAvatarUploadError turns Laravel's English validator messages
      // (which getErrorMessage extracts verbatim) into localised,
      // actionable toasts.
      toast.error(mapAvatarUploadError(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    // Client-side validation against the BE's 64-char cap so the
    // user gets a localised error instead of a raw 422.
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedBirthDate = birthDate.trim();
    if (trimmedFirst.length > NAME_MAX_LENGTH || trimmedLast.length > NAME_MAX_LENGTH) {
      toast.error(t.profileEdit.nameTooLong);
      return;
    }
    if (trimmedPhone.length > PHONE_MAX_LENGTH) {
      toast.error(t.profileEdit.phoneTooLong);
      return;
    }
    if (trimmedBirthDate !== '' && !isValidBirthDate(trimmedBirthDate)) {
      toast.error(t.profileEdit.birthDateInvalid);
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        phone: trimmedPhone || null,
        birth_date: trimmedBirthDate || null,
        avatar_url: avatarUrl.trim() || null,
      });
      toast.success(t.profileEdit.successToast);
      router.back();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // While the user is typing a new URL we show their preview; if both
  // form state and persisted avatar are empty, UserAvatar falls back
  // to the bundled User icon. No transparent placeholder ever leaks.
  const previewAvatarUrl = avatarUrl || user?.avatar_url || null;

  // Display name preference order: full name → first name only → login.
  // Pre-fix the screen always showed `user.login` even when the user
  // had set a full name — confusing because the screen's whole purpose
  // is editing those name fields.
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.first_name ||
    user?.login ||
    '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
        <SimpleHeader title={t.profileEdit.headerTitle} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar — outer wrap is now a single TouchableOpacity so
              the entire avatar area (ring + name + hint) is the tap
              target. Pre-fix the tap target was just the 100×100
              gradient ring and tapping near it didn't register.
              The camera badge at the corner makes the tap-to-edit
              affordance obvious; before this users reported the
              avatar felt "static" and didn't know they could change
              it. */}
          <TouchableOpacity
            style={styles.avatarSection}
            activeOpacity={0.85}
            onPress={onPickAvatar}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel={t.profileEdit.changeAvatar}
            accessibilityHint={t.profileEdit.changeAvatarHint}
          >
            <View style={styles.avatarRingWrap}>
              <LinearGradient
                colors={['#7C3AED', '#FF34E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                {/* Inner avatar — size matches the ring's inner area
                    so the gradient becomes a true 3pt ring around the
                    avatar, not a halo with a gap. Old layout used a
                    raw `size={88}` against a 100pt ring with 3pt
                    padding (94pt inner) leaving a 3pt black ring
                    between the gradient and the avatar. */}
                <UserAvatar avatarUrl={previewAvatarUrl} size={94} ring={false} />
                {uploadingAvatar && (
                  <View style={styles.avatarUploadOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
              {/* Camera badge — sits at the bottom-right corner of
                  the avatar. Industry-standard "edit photo"
                  affordance (Instagram, WhatsApp, Telegram all use
                  the same convention). Without it, users on the
                  smaller screens reported they didn't realise the
                  avatar was tappable. */}
              <View style={styles.cameraBadge}>
                <Camera size={14} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </View>
            {!!displayName && <Text style={styles.avatarName}>{displayName}</Text>}
            <Text style={styles.avatarHint}>
              {uploadingAvatar ? t.profileEdit.avatarUploadingHint : t.profileEdit.changeAvatar}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>{t.profileEdit.firstName}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t.profileEdit.firstName}
              placeholderTextColor="#6B7280"
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>{t.profileEdit.lastName}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t.profileEdit.lastName}
              placeholderTextColor="#6B7280"
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>{t.profileEdit.phone}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t.profileEdit.phonePlaceholder}
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              maxLength={PHONE_MAX_LENGTH}
              returnKeyType="done"
              // Pre-fix the keyboard's default was `default` which
              // showed the QWERTY layout on a numeric field. Users
              // had to long-press for "123" toggle. phone-pad
              // matches what every other app shows for phone fields.
            />
          </View>
          <Text style={styles.hint}>{t.profileEdit.phoneHint}</Text>

          <Text style={styles.label}>{t.profileEdit.birthDate}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={(next) => setBirthDate(next.replace(/[^\d-]/g, '').slice(0, BIRTH_DATE_MAX_LENGTH))}
              placeholder={t.profileEdit.birthDatePlaceholder}
              placeholderTextColor="#6B7280"
              keyboardType="numbers-and-punctuation"
              maxLength={BIRTH_DATE_MAX_LENGTH}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.hint}>{t.profileEdit.birthDateHint}</Text>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Save-profile CTA — full-width lg pill matches the rest
              of the "commit work" buttons (login, club-join, ticket).
              Spinner-only loading state (no loadingLabel) because
              the save call is short and a label flash would feel
              jittery. */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t.profileEdit.saveBtn}
            accessibilityState={{ disabled: saving, busy: saving }}
            style={[saveBtnStyles.btn, saving && saveBtnStyles.btnDisabled]}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={saveBtnStyles.fill}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={saveBtnStyles.label}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t.profileEdit.saveBtn}
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
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  // Avatar section is a vertically-stacked tap target. Increased
  // padding (was 16) so users with thumb-only grip can hit it
  // without precision-aiming at the ring.
  avatarSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  // Outer wrap holds the ring + the corner badge in absolute
  // position. The wrap itself is the avatar's bounding box so the
  // badge can anchor to it without changing the ring layout.
  avatarRingWrap: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  // Bottom-right corner camera badge. Sits OUTSIDE the gradient
  // ring (positive translateX/Y from the wrap's bottom-right
  // corner) so it reads as "tap to edit" rather than "part of
  // the photo". 4pt of dark border so it has visual separation
  // from the avatar even with bright photos.
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    // Subtle shadow so the badge floats above the avatar
    // photo, not against it.
    shadowColor: '#00CFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginTop: 12,
  },
  avatarHint: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#00CFFF',
    // Higher-contrast color (was #8B95A8 grey) so the hint reads as
    // an actionable CTA instead of metadata. Matches the system-
    // accent treatment of "Add photo" hints in iOS Contacts /
    // Telegram profile edit.
  },
  label: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
    marginTop: 18,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  input: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  hint: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 16,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});

// Inline save-CTA styles — 52pt lg pill flush against the bottom
// inset. Same shape as the other "commit your changes" buttons.
const saveBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return parsed <= todayUtc;
}

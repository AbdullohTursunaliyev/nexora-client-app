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
import Button from '../components/common/Button';
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
  const { user, saveProfile } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      });
      if (picked.canceled) return;
      const asset = picked.assets?.[0];
      if (!asset?.uri) return;

      setUploadingAvatar(true);
      // Derive filename + mime from the asset metadata when available;
      // fall back to JPEG (the most common phone-camera output).
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';

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
      toast.success(t.profileEdit.avatarUploadedToast);
    } catch (e) {
      toast.error(getErrorMessage(e));
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
    if (trimmedFirst.length > NAME_MAX_LENGTH || trimmedLast.length > NAME_MAX_LENGTH) {
      toast.error(t.profileEdit.nameTooLong);
      return;
    }
    if (trimmedPhone.length > PHONE_MAX_LENGTH) {
      toast.error(t.profileEdit.phoneTooLong);
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        first_name: trimmedFirst || null,
        last_name: trimmedLast || null,
        phone: trimmedPhone || null,
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
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            label={t.profileEdit.saveBtn}
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            onPress={onSave}
          />
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

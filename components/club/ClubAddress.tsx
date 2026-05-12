import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import LocationPinIcon from '../icons/LocationPinIcon';
import { useToast } from '../common/Toast';
import { getErrorMessage } from '../../lib/api/client';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  address: string;
  distanceKm: number;
  lat?: number;
  lng?: number;
}

/**
 * Address card shown on the club-details screen.
 *
 * Three independent inputs we may or may not have:
 *   - `address` (human-readable street)
 *   - `lat` / `lng` (coords for opening native maps)
 *   - `distanceKm` (computed by the BE relative to the user's GPS)
 *
 * Pre-fix the component rendered an empty <Text> when `address` came
 * back as `""` from the BE — the row was just an icon + a 14pt-tall
 * blank space, which reads as "broken card". Now we:
 *   - Fall back to a localised "manzil kiritilmagan" label
 *   - Disable the tap-to-open-maps gesture if coords are also missing
 *     (so the row doesn't pretend to be interactive when there's
 *     nothing to deep-link)
 *   - Treat 0,0 as "missing" (BE seed for unset coordinates) and skip
 *     the deep-link rather than open Atlantic-ocean pin
 */
export default function ClubAddress({ address, distanceKm, lat, lng }: Props) {
  const toast = useToast();
  const t = useT();

  // Treat empty / whitespace-only as missing. 0,0 lat/lng is the
  // BE's "not geocoded yet" sentinel — opening a deep-link to it
  // would drop a pin in the Atlantic Ocean which is worse than no
  // pin at all.
  const trimmedAddress = (address ?? '').trim();
  const hasAddress = trimmedAddress.length > 0;
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);

  // Map deep-link requires BOTH coords AND a real address string.
  // Pre-fix the tap fired on coords alone — but a club with lat/lng
  // 41.x/69.x and an empty street label would open Maps at a random
  // point in Tashkent without context. User feedback: "agar address
  // yo'q bo'lsa click bo'lganda map options ochilmasin" — when the
  // address is missing we now treat the row as static info instead.
  const canOpenMaps = hasCoords && hasAddress;
  const displayAddress = hasAddress ? trimmedAddress : t.clubDetails.addressUnknown;

  const onOpenMaps = () => {
    if (!canOpenMaps) return;
    const label = encodeURIComponent(hasAddress ? trimmedAddress : '');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    if (!url) return;
    // Surface a toast on failure (e.g. Android device with no maps
    // app installed). Pre-fix the empty `.catch(() => {})` left
    // users tapping the address with no feedback when the deep-link
    // couldn't resolve.
    Linking.openURL(url).catch((e) => toast.error(getErrorMessage(e)));
  };

  // Render as a non-interactive View when there's nothing to deep-link
  // (no coords). Keeps the visual layout consistent but doesn't lie
  // about being tappable. The TouchableOpacity path is identical
  // visually but adds the accessibility hint + onPress.
  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = canOpenMaps
    ? ({ children }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={onOpenMaps}
          accessibilityRole="button"
          accessibilityLabel={t.discover.direction}
        >
          {children}
        </TouchableOpacity>
      )
    : ({ children }) => <View style={styles.row}>{children}</View>;

  return (
    <Wrapper>
      <View style={styles.iconWrap}>
        <LocationPinIcon size={18} color="#00E5FF" />
      </View>
      <View style={styles.textWrap}>
        <Text
          style={[styles.address, !hasAddress && styles.addressMissing]}
          numberOfLines={2}
        >
          {displayAddress}
        </Text>
      </View>
      {/* Hide the distance pill when the caller hasn't computed one
          yet (BE returns null → adapter stores 0). Showing "0.0 km"
          implies the user is standing at the club, which is the
          ambiguity the discover-tab `0.0 km` complaint surfaced. */}
      {distanceKm > 0 && (
        <View style={styles.distancePill}>
          <Text style={styles.distance}>{distanceKm.toFixed(1)} km</Text>
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginTop: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  address: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  // Muted style when the address is a placeholder — visually signals
  // "no real data" so the user doesn't mistake "Manzil kiritilmagan"
  // for the actual street name.
  addressMissing: {
    fontFamily: Fonts.inter.regular,
    color: '#8B95A8',
    fontStyle: 'italic',
  },
  distancePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  distance: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11.5,
    color: '#8B95A8',
  },
});

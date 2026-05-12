import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ClubMapPin from '../icons/ClubMapPin';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { MapClub } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';
import type { Coords } from '../../lib/util/distance';

interface Props {
  clubs: MapClub[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Accepted for API parity with the native MapView so the discover
   * orchestrator can pass it unconditionally — web has no tile map
   * to overlay the route on, so we ignore it. The route banner up in
   * discover.tsx still renders, which is the part users actually need
   * (distance + ETA).
   */
  routeCoordinates?: Coords[] | null;
  /**
   * Same — accepted for API parity. Real-time follow + heading rotate
   * needs a tiled map canvas which the web stub doesn't have.
   */
  navigationMode?: boolean;
}

// Web fallback — react-native-maps doesn't support web. Native version
// is in MapView.native.tsx and Metro picks it on iOS/Android.
export default function MapView({ clubs, selectedId, onSelect }: Props) {
  const t = useT();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0E1422', '#0B0F16']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>{t.components.webMapTitle}</Text>
        <Text style={styles.noticeSub}>{t.components.webMapSub}</Text>
      </View>
      <View style={styles.pinList}>
        {clubs.slice(0, 5).map((club) => {
          const isActive = selectedId === club.id;
          return (
            <TouchableOpacity
              key={club.id}
              style={[styles.pin, isActive && styles.pinActive]}
              onPress={() => onSelect(club.id)}
              activeOpacity={0.85}
            >
              <ClubMapPin
                imageUri={club.image}
                rating={club.rating}
                isOpen={club.isOpen}
                variant={isActive ? 'active' : club.isOpen ? 'open' : 'closed'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  notice: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(20, 24, 35, 0.85)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
  },
  noticeTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  noticeSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
    marginTop: 4,
  },
  pinList: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    flexWrap: 'wrap',
    gap: 16,
  },
  pin: {
    padding: 4,
  },
  pinActive: {
    transform: [{ scale: 1.15 }],
  },
});

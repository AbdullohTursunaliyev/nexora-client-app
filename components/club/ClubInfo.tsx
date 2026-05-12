import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import StarIcon from '../icons/StarIcon';
import VerifiedIcon from '../icons/VerifiedIcon';
import { MapClub } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  club: MapClub;
}

export default function ClubInfo({ club }: Props) {
  const t = useT();

  const openText = club.isOpen
    ? club.open24h
      ? t.clubDetails.open24h
      : t.clubDetails.open
    : t.clubDetails.closed;

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={2}>
          {club.name}
        </Text>
        {club.verified && (
          <View style={styles.verifiedWrap}>
            <VerifiedIcon size={18} color="#00CFFF" />
          </View>
        )}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.ratingBlock}>
          <StarIcon size={14} color="#F59E0B" />
          <Text style={styles.ratingNumber}>{club.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>
            {t.clubDetails.reviewCount.replace('{n}', String(club.reviewCount))}
          </Text>
        </View>
        <Text style={styles.dotSep}>·</Text>
        <View style={styles.openWrap}>
          <View style={[styles.openDot, !club.isOpen && styles.closedDot]} />
          <Text style={[styles.openText, !club.isOpen && styles.closedText]}>{openText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  verifiedWrap: {
    marginTop: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  reviewCount: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  dotSep: {
    color: '#8B95A8',
    fontSize: 14,
  },
  openWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  closedDot: {
    backgroundColor: '#EF4444',
  },
  openText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#22C55E',
  },
  closedText: {
    color: '#EF4444',
  },
});

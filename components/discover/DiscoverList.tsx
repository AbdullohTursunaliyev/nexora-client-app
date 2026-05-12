import { RefreshControl, ScrollView, StyleSheet, View, Text } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import ClubCard from '../home/ClubCard';
import { MapClub } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  clubs: MapClub[];
  /** Re-fetch the underlying club list. Wired by the parent screen. */
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

export default function DiscoverList({ clubs, onRefresh, refreshing = false }: Props) {
  const t = useT();

  if (clubs.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyScroll}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CFFF" />
          ) : undefined
        }
      >
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>{t.discover.emptyTitle}</Text>
          <Text style={styles.emptySub}>{t.discover.emptySub}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CFFF" />
        ) : undefined
      }
    >
      {clubs.map((club) => (
        <View key={club.id} style={styles.cardWrap}>
          <ClubCard club={club} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  // Empty-state still needs a vertical-scroll container so the
  // pull-to-refresh gesture works even when there's nothing to scroll.
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  cardWrap: {},
  empty: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
});

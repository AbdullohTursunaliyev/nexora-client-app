import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import MapView from '../../components/discover/MapView';
import DiscoverList from '../../components/discover/DiscoverList';
import SelectedClubCard from '../../components/discover/SelectedClubCard';
import ViewToggle, { ViewMode } from '../../components/discover/ViewToggle';
import FilterChips from '../../components/discover/FilterChips';
import FilterSheet from '../../components/discover/FilterSheet';
import SearchIcon from '../../components/icons/SearchIcon';
import CloseIcon from '../../components/icons/CloseIcon';
import FilterIcon from '../../components/icons/FilterIcon';
import NavigationIcon from '../../components/icons/NavigationIcon';
import { useToast } from '../../components/common/Toast';
import { useDiscoverClubs } from '../../lib/hooks/useDiscoverClubs';
import { useUserLocation } from '../../lib/hooks/useUserLocation';
import { useT } from '../../lib/i18n/LocaleProvider';
import { useDiscoverFilters } from '../../lib/state/useDiscoverFilters';
import { haversine } from '../../lib/util/distance';
import { fetchRoute, type RouteResult } from '../../lib/util/routing';

/**
 * Discover / poisk screen.
 *
 * Header is intentionally a single row: search input grows to fill the
 * width, with the view toggle and the advanced-filter button pinned to
 * the right. We dropped the city selector and the quick-chip row
 * (All / PC / PS / Open) in the 2026-05-11 cleanup — those chips moved
 * into the FilterSheet's advanced section and city was purely
 * decorative (the BE returns every tenant regardless of city).
 *
 * Selection model is strict: nothing is highlighted on mount, and a
 * club narrowed out by search or advanced filters is deselected
 * (returns null instead of silently swapping the card content) so the
 * pin a user tapped is always the pin they're looking at.
 */
export default function DiscoverScreen() {
  const t = useT();
  const toast = useToast();
  const { filter, setFilter, advanced, setAdvanced, ready: filtersReady } = useDiscoverFilters();
  const { clubs, refresh: refreshClubs } = useDiscoverClubs();
  const rawLocation = useUserLocation();

  // Distance-stable user location — only updates when the device has
  // moved more than ~25m. Pre-fix every GPS jitter (which fires
  // every few seconds on most phones) re-ran the haversine map +
  // filter pipeline over every club. With even a few dozen clubs
  // visible that's a meaningful CPU hit on lower-end Android. The
  // 25m threshold matches what most mapping apps use for "this user
  // hasn't really moved" — well below the resolution of any
  // distance filter the user can pick (1 km / 2 km / 5 km).
  // Audit L2.
  const [stableLocation, setStableLocation] = useState(rawLocation);
  useEffect(() => {
    if (!rawLocation) {
      setStableLocation(null);
      return;
    }
    if (!stableLocation) {
      setStableLocation(rawLocation);
      return;
    }
    const deltaM = haversine(stableLocation, rawLocation) * 1000;
    if (deltaM > 25) {
      setStableLocation(rawLocation);
    }
  }, [rawLocation, stableLocation]);
  const userLocation = stableLocation;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [mode, setMode] = useState<ViewMode>('map');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [query, setQuery] = useState('');

  // In-app directions overlay. We track which club the route is for
  // separately from `route` so we can clear the overlay when the user
  // taps a DIFFERENT club's marker (the route is stale at that point
  // and would look like a glitch staying behind). The AbortController
  // lets us cancel an in-flight OSRM call if the user mashes the
  // button against another club before the first call returns.
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeClubId, setRouteClubId] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const routeAbortRef = useRef<AbortController | null>(null);

  // When the active selection changes (user taps a different pin,
  // changes filters, etc.), any in-flight route fetch becomes stale.
  // Cancel it so we don't paint an old route under a new selection.
  useEffect(() => {
    return () => {
      routeAbortRef.current?.abort();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshClubs();
    } finally {
      setRefreshing(false);
    }
  };

  const visibleClubs = useMemo(() => {
    // Enrich each club with real haversine distance from the user's
    // current coords FIRST, so the advanced-distance filter further
    // down sees the live number rather than the BE's null-→-0
    // fallback. When location is unknown we leave `distanceKm` at
    // whatever the BE/adapter sent (always 0 right now) and downstream
    // consumers hide the label.
    let result = userLocation
      ? clubs.map((c) => ({
          ...c,
          distanceKm: haversine(userLocation, { latitude: c.lat, longitude: c.lng }),
        }))
      : clubs;

    if (filter === 'pc') result = result.filter((c) => c.type === 'pc' || c.type === 'mixed');
    else if (filter === 'ps') result = result.filter((c) => c.hasPSZone);
    else if (filter === 'open') result = result.filter((c) => c.isOpen);

    const { minRating, maxDistanceKm } = advanced;
    if (minRating != null) result = result.filter((c) => c.rating >= minRating);
    if (maxDistanceKm != null) result = result.filter((c) => c.distanceKm <= maxDistanceKm);

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.address ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [clubs, userLocation, filter, advanced, query]);

  const selectedClub = useMemo(() => {
    if (!selectedId) return null;
    return visibleClubs.find((c) => c.id === selectedId) ?? null;
  }, [visibleClubs, selectedId]);

  // When a route is active and we've entered navigation mode, hide
  // every OTHER club's marker so the destination + the cyan polyline
  // are the only things on the map. Same UX as Yandex / Google Maps
  // when you start a route — the surrounding POIs disappear so the
  // user can focus on the road ahead without misclicks pulling them
  // into a different club. When no route is active we pass the full
  // filtered list through unchanged.
  const mapClubs = useMemo(() => {
    if (route && selectedClub && routeClubId === selectedClub.id) {
      return [selectedClub];
    }
    return visibleClubs;
  }, [visibleClubs, route, selectedClub, routeClubId]);

  const swipeNext = useCallback(() => {
    if (!selectedClub || visibleClubs.length < 2) return;
    const idx = visibleClubs.findIndex((c) => c.id === selectedClub.id);
    setSelectedId(visibleClubs[(idx + 1) % visibleClubs.length].id);
  }, [selectedClub, visibleClubs]);

  const swipePrev = useCallback(() => {
    if (!selectedClub || visibleClubs.length < 2) return;
    const idx = visibleClubs.findIndex((c) => c.id === selectedClub.id);
    setSelectedId(visibleClubs[(idx - 1 + visibleClubs.length) % visibleClubs.length].id);
  }, [selectedClub, visibleClubs]);

  const clearAll = useCallback(() => {
    setQuery('');
    setFilter('all');
    setAdvanced({ minRating: null, maxDistanceKm: null });
  }, [setFilter, setAdvanced]);

  // Drop the route overlay whenever the route's club is no longer the
  // active selection — either the user picked a different pin, the
  // filters narrowed it out, or they closed the card. Without this
  // guard the route would visually persist across selections, which
  // looked broken in QA ("why is there a line to nothing?").
  useEffect(() => {
    if (!route) return;
    if (!selectedClub || selectedClub.id !== routeClubId) {
      routeAbortRef.current?.abort();
      setRoute(null);
      setRouteClubId(null);
      setRouteLoading(false);
    }
  }, [selectedClub, route, routeClubId]);

  // Same idea, but for mode-switch: leaving the map view should drop
  // the route — the list view has no canvas to overlay it on.
  useEffect(() => {
    if (mode !== 'map' && route) {
      routeAbortRef.current?.abort();
      setRoute(null);
      setRouteClubId(null);
      setRouteLoading(false);
    }
  }, [mode, route]);

  const handleShowDirections = useCallback(async () => {
    if (!selectedClub) return;

    // Toggle off if the active route is already for this club.
    if (route && routeClubId === selectedClub.id) {
      routeAbortRef.current?.abort();
      setRoute(null);
      setRouteClubId(null);
      setRouteLoading(false);
      return;
    }

    if (!userLocation) {
      // No GPS yet — surface the same banner that lives on the map
      // (which has the actual permission flow). A toast tells the
      // user to grant location before we can compute a route from
      // "you" to "the club".
      toast.error(t.discover.directionsNeedGps);
      return;
    }

    // Cancel any in-flight call before starting a new one. The
    // previous call's `signal.aborted` short-circuits the fetch and
    // throws — we swallow that case in the catch below.
    routeAbortRef.current?.abort();
    const ac = new AbortController();
    routeAbortRef.current = ac;

    setRouteLoading(true);
    setRouteClubId(selectedClub.id);
    try {
      const result = await fetchRoute(
        userLocation,
        { latitude: selectedClub.lat, longitude: selectedClub.lng },
        ac.signal,
      );
      // Bail if we got aborted between the await and here — the user
      // tapped another marker or closed the card mid-flight, and a
      // newer fetch is already starting.
      if (ac.signal.aborted) return;
      setRoute(result);
      if (result.isFallback) {
        // Soft warn: we still drew SOMETHING but it's a crow-flies
        // line, not a real road route. Users see why their "12 min"
        // ETA might be optimistic.
        toast.error(t.discover.directionsApprox);
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      toast.error(t.discover.directionsErrorRoute);
      setRouteClubId(null);
    } finally {
      if (routeAbortRef.current === ac) setRouteLoading(false);
    }
  }, [selectedClub, route, routeClubId, userLocation, toast, t]);

  const advancedActiveCount =
    (advanced.minRating != null ? 1 : 0) + (advanced.maxDistanceKm != null ? 1 : 0);
  const hasAnyNarrowing =
    advancedActiveCount > 0 || filter !== 'all' || query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Row 1 — primary action lives here: searching is what users
          come to /discover to do. Filter is the only companion so the
          search field gets ~85% of the row width, never feels squeezed
          even on a 360pt device. */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color="#8B95A8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t.discover.searchPlaceholder}
            placeholderTextColor="#5A6A85"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} activeOpacity={0.6}>
              <CloseIcon size={14} color="#8B95A8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.7}
          onPress={() => setFilterSheetOpen(true)}
        >
          <FilterIcon size={18} color={Colors.text} />
          {advancedActiveCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{advancedActiveCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Row 2 — quick filter chips sit BETWEEN search and the view
          toggle. We keep the row's height reserved with `chipsRow` but
          fade the chips in only after AsyncStorage hydration completes
          — otherwise the persisted-filter user sees "Barchasi" briefly
          flash as active before the chip they actually picked lights
          up. Opacity gate avoids both layout shift and that one-frame
          flash. */}
      <View style={[styles.chipsRow, { opacity: filtersReady ? 1 : 0 }]}>
        <FilterChips value={filter} onChange={setFilter} />
      </View>

      {/* Row 3 — view switch as a deliberate segmented control. Full
          width so it reads as a structural mode switch (like iOS Maps'
          List/Map toggle), not a third button competing with search +
          filter for attention. */}
      <View style={styles.toggleRow}>
        <ViewToggle value={mode} onChange={setMode} />
      </View>

      {mode === 'map' ? (
        <>
          <View style={styles.mapContainer}>
            <MapView
              clubs={mapClubs}
              selectedId={selectedClub?.id ?? null}
              onSelect={setSelectedId}
              routeCoordinates={
                route && selectedClub && routeClubId === selectedClub.id
                  ? route.coordinates
                  : null
              }
              navigationMode={
                !!route && !!selectedClub && routeClubId === selectedClub.id
              }
            />
            {/* Route info banner — floats at the top of the map only
                while a route is active. Cyan accent matches the
                polyline below so users grasp the visual link. The
                banner is purely informational; the SelectedClubCard
                holds the toggle. */}
            {route && selectedClub && routeClubId === selectedClub.id && (
              <View style={styles.routeBanner} pointerEvents="box-none">
                <View style={styles.routeBadgeIcon}>
                  <NavigationIcon size={14} color="#00CFFF" />
                </View>
                <View style={styles.routeBannerText}>
                  <Text style={styles.routeBannerTitle} numberOfLines={1}>
                    {formatRouteSummary(route, t)}
                  </Text>
                  <Text style={styles.routeBannerSub} numberOfLines={1}>
                    {route.isFallback
                      ? t.discover.directionsApproxHint
                      : t.discover.directionsFromYou.replace(
                          '{club}',
                          selectedClub.name,
                        )}
                  </Text>
                </View>
              </View>
            )}
          </View>
          {selectedClub && (
            <View style={styles.cardSlot}>
              <SelectedClubCard
                club={selectedClub}
                onSwipeLeft={visibleClubs.length > 1 ? swipeNext : undefined}
                onSwipeRight={visibleClubs.length > 1 ? swipePrev : undefined}
                onClose={() => setSelectedId('')}
                onShowDirections={handleShowDirections}
                routeActive={!!route && routeClubId === selectedClub.id}
                routeLoading={routeLoading && routeClubId === selectedClub.id}
              />
            </View>
          )}
          {!selectedClub && visibleClubs.length === 0 && (
            <View style={styles.cardSlot}>
              <EmptyResults hasAnyNarrowing={hasAnyNarrowing} t={t} onClear={clearAll} />
            </View>
          )}
        </>
      ) : (
        <View style={styles.listContainer}>
          {visibleClubs.length === 0 ? (
            <View style={styles.listEmptyWrap}>
              <EmptyResults hasAnyNarrowing={hasAnyNarrowing} t={t} onClear={clearAll} />
            </View>
          ) : (
            <DiscoverList clubs={visibleClubs} onRefresh={onRefresh} refreshing={refreshing} />
          )}
        </View>
      )}

      <FilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        value={advanced}
        onApply={setAdvanced}
      />
    </SafeAreaView>
  );
}

interface EmptyResultsProps {
  hasAnyNarrowing: boolean;
  t: ReturnType<typeof useT>;
  onClear: () => void;
}

/**
 * Compact "5.2 km · 12 min" summary for the route banner.
 *
 * Distance: under 1 km we drop to "850 m" so a 0.8-km route doesn't
 * read as "0.8 km" (which feels less precise than the integer-metres
 * form). At or above 1 km we use one decimal — matches how the
 * SelectedClubCard formats club-distance elsewhere.
 *
 * Duration: under 60 min we show whole minutes ("12 min"); at or above
 * we split into "1 h 23 min". The "h" / "min" suffixes come from i18n
 * so future locales (e.g. Russian "ч" / "мин") just plug in.
 */
function formatRouteSummary(route: RouteResult, t: ReturnType<typeof useT>): string {
  const km = route.distanceKm;
  // Floor at 10m — anything smaller is GPS noise that would read as
  // "1 m" which feels broken. Above 1km we round to 1 decimal (the
  // same convention used in the SelectedClubCard subtitle).
  const dist =
    km < 1
      ? `${Math.max(10, Math.round(km * 1000))} ${t.discover.metersShort}`
      : `${km.toFixed(1)} ${t.discover.kmShort}`;

  const totalMin = Math.max(1, Math.round(route.durationMin));
  const dur = (() => {
    if (totalMin < 60) return `${totalMin} ${t.discover.minutesShort}`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    // Drop the "0 min" tail when the route lands on a clean hour —
    // "1 h 0 min" reads like a copy-paste bug; "1 h" is what every
    // navigator app shows for an exactly-hour ETA.
    return m === 0
      ? `${h} ${t.discover.hoursShort}`
      : `${h} ${t.discover.hoursShort} ${m} ${t.discover.minutesShort}`;
  })();

  return `${dist} · ${dur}`;
}

function EmptyResults({ hasAnyNarrowing, t, onClear }: EmptyResultsProps) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyTitle}>{t.discover.emptyTitle}</Text>
      <Text style={styles.emptySub}>{t.discover.emptySub}</Text>
      {hasAnyNarrowing && (
        <TouchableOpacity style={styles.clearBtn} activeOpacity={0.85} onPress={onClear}>
          <Text style={styles.clearBtnText}>{t.discover.clearFilters}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Row 1 — search field + filter button. 10pt gap is the minimum
  // visual breathing room that keeps the two from reading as a single
  // joined widget. 8pt vertical padding lifts the row off the safe-
  // area top so the search box has a recognisable hairline of dark
  // background above it.
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Quick chip strip — 12pt top breathing room from search bar, no
  // right padding because FilterChips' contentContainerStyle controls
  // the edge bleed for the horizontal-scroll affordance.
  chipsRow: {
    paddingLeft: 16,
    paddingTop: 12,
  },
  // Full-width segmented switch sits in its own padded slot. 10pt
  // top padding gives clean separation from chips above; 12pt bottom
  // separates from the map.
  toggleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00CFFF',
    borderWidth: 2,
    borderColor: '#080F16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 9.5,
    color: '#0B0F16',
    lineHeight: 11,
  },

  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  // Route banner — floats at the top of the map while a route is
  // active. 12pt top + 12pt side gutters match the GPS banner inside
  // MapView.native so the two never visually clash (they're never
  // both visible — GPS banner shows only when permission is denied,
  // route banner only when permission is granted + a route is set).
  // `pointerEvents="box-none"` on the parent lets taps fall through
  // to the map underneath while the inner Touchables (none here yet)
  // would still receive events if added.
  routeBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 24, 35, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.4)',
    borderRadius: 12,
    padding: 10,
  },
  routeBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  routeBannerText: {
    flex: 1,
    gap: 2,
  },
  routeBannerTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  routeBannerSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  listContainer: {
    flex: 1,
  },
  cardSlot: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  listEmptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 18,
  },
  clearBtn: {
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 6,
  },
  clearBtnText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#0B0F16',
  },
});

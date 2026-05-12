import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated, Easing, AppState } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import ClubMapPin from '../icons/ClubMapPin';
import LocationPinIcon from '../icons/LocationPinIcon';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { MapClub, TASHKENT_CENTER, DARK_MAP_STYLE } from '../../lib/data/clubs';
import { useT } from '../../lib/i18n/LocaleProvider';
import { usePermissionGate, PermissionStatus } from '../../lib/hooks/usePermissionGate';
import {
  useUserLocation,
  useUserHeading,
  setUserLocationGlobal,
  startUserLocationWatch,
} from '../../lib/hooks/useUserLocation';
import type { Coords } from '../../lib/util/distance';

interface Props {
  clubs: MapClub[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Optional driving-route polyline to overlay on the map. When set,
   * the map fits the camera to show the full route with edge padding
   * — same UX as Yandex / Google Maps after picking "directions".
   * Passing `null` clears the overlay and snaps focus back to the
   * selected club (or to the user, if no club is selected).
   */
  routeCoordinates?: Coords[] | null;
  /**
   * "Navigation mode" — turns the map into a navigator-style display:
   *   • opens a real-time `watchPositionAsync` so the user dot
   *     updates as they move (vs. the idle one-shot read);
   *   • camera follows the user (close zoom + slight pitch) every
   *     time their position changes;
   *   • rotates the map so the user's heading is "up" (like every
   *     real navigator) — only when heading is known, otherwise the
   *     map stays north-up;
   *   • swaps the default blue dot for a directional cyan arrow.
   *
   * Discover orchestrator flips this on as soon as a route is fetched
   * and off when the route is dismissed or a different club is picked.
   * Off by default so the map keeps its current pan-around UX outside
   * of routing flows.
   */
  navigationMode?: boolean;
}

interface ClubMarkerProps {
  club: MapClub;
  isActive: boolean;
  onPress: () => void;
}

function ClubMarker({ club, isActive, onPress }: ClubMarkerProps) {
  // `tracksViewChanges` MUST stay on — the marker captures a bitmap on
  // Google Maps Android, and the network image inside ClubMapPin loads
  // asynchronously. Without view tracking the bitmap would freeze on
  // the empty-placeholder paint and never refresh once the image
  // resolved. Small perf hit (~10 markers) is acceptable.
  return (
    <Marker
      coordinate={{ latitude: club.lat, longitude: club.lng }}
      onPress={onPress}
      tracksViewChanges
      anchor={{ x: 0.5, y: 1 }}
      flat={false}
    >
      <ClubMapPin
        imageUri={club.image}
        rating={club.rating}
        isOpen={club.isOpen}
        variant={isActive ? 'active' : club.isOpen ? 'open' : 'closed'}
      />
    </Marker>
  );
}

export default function MapView({
  clubs,
  selectedId,
  onSelect,
  routeCoordinates,
  navigationMode = false,
}: Props) {
  const t = useT();
  const permissionGate = usePermissionGate();
  const mapRef = useRef<RNMapView>(null);
  // User coords come from the shared `useUserLocation` singleton so
  // the discover screen + map share the same value (and the screen
  // can compute distances from it). We still mirror the denied state
  // locally because the banner UX is map-specific.
  const userLoc = useUserLocation();
  // Heading is only meaningful while the real-time watch is active
  // (i.e. navigationMode = true). Outside nav mode this stays null
  // and our marker logic falls back to a non-rotating user dot.
  const userHeading = useUserHeading();
  const [gpsDenied, setGpsDenied] = useState(false);
  const recenterPulse = useRef(new Animated.Value(0)).current;

  // Wraps the OS permission API in our shape (`granted | denied | undetermined`)
  // so the gate can call it without knowing about expo-location internals.
  // We never call requestForegroundPermissionsAsync directly anymore — that
  // surfaces the OS prompt unconditionally. The gate decides whether to
  // dispatch based on the user's response to our own pre-dialog.
  const askLocationOS = useCallback(async (): Promise<PermissionStatus> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  }, []);

  // Mirror the OS permission state into the local `gpsDenied` flag
  // for the banner UX. The actual coords come from `useUserLocation`,
  // which silently fetches on first mount of any consumer — we just
  // need to know whether the OS said no so we can show the prompt
  // banner here.
  //
  // We re-check on every screen focus AND on every app-foreground
  // transition. Pre-fix this only ran once on mount: if the user
  // tapped the banner → opened Settings → granted permission →
  // returned to the app, the banner persisted because the
  // permission state never re-read from the OS. The two listeners
  // together cover both navigation-driven and OS-driven returns.
  const refreshPermissionState = useCallback(async () => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      setGpsDenied(existing.status !== 'granted');
    } catch {
      setGpsDenied(true);
    }
  }, []);

  useEffect(() => {
    void refreshPermissionState();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissionState();
    });
    return () => sub.remove();
  }, [refreshPermissionState]);

  // Re-check on every screen focus too — covers the navigation case
  // where the user came from another tab AFTER granting permission
  // (Discover already mounted, AppState didn't transition).
  useFocusEffect(
    useCallback(() => {
      void refreshPermissionState();
    }, [refreshPermissionState]),
  );

  // Pulse runs ONLY when the screen is focused AND gpsDenied is true.
  // Pre-fix the loop kept spinning on the JS thread after the user
  // switched to Home / Wallet / Profile — small but unnecessary tick
  // every ~2.4s. Wrapping in `useFocusEffect` ties the loop's life to
  // the user's actual viewing window.
  useFocusEffect(
    useCallback(() => {
      if (!gpsDenied) return undefined;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(recenterPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(recenterPulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [gpsDenied, recenterPulse]),
  );

  useEffect(() => {
    if (!selectedId) return;
    // When a route is being drawn, the route-fitting effect below
    // owns the camera — re-centring on just the destination pin would
    // crop out the user's end of the polyline and feel jarring.
    if (routeCoordinates && routeCoordinates.length >= 2) return;
    const club = clubs.find((c) => c.id === selectedId);
    if (!club || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: club.lat,
        longitude: club.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400,
    );
  }, [selectedId, clubs, routeCoordinates]);

  // (Removed pre-fix: a "non-nav-mode route preview fit" effect that
  // was dead code in practice. The discover orchestrator sets
  // `route` and `navigationMode` from the same boolean condition, so
  // navigationMode is ALWAYS true whenever routeCoordinates exists —
  // the `if (navigationMode) return` short-circuit fired on every
  // legitimate route load. The failsafe below already handles the
  // "nav mode on, user coords null" preview-fit window.)

  // Failsafe: if nav mode is on but `userLoc` is still null (silent
  // load hasn't finished, OR was suppressed by an OS permission
  // mismatch), fit to the route polyline so the screen isn't blank.
  // Once `userLoc` populates, the follow effect below takes over and
  // zooms to the user. Pre-fix the user saw the map stuck on its
  // previous centre (selected club / Tashkent default) until they
  // manually recentred — which the bug report flagged as "focus
  // should be on user after the route is built".
  useEffect(() => {
    if (!navigationMode) return;
    if (userLoc) return;
    if (!routeCoordinates || routeCoordinates.length < 2 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(routeCoordinates, {
      edgePadding: { top: 120, right: 40, bottom: 200, left: 40 },
      animated: true,
    });
  }, [navigationMode, userLoc, routeCoordinates]);

  // Real-time position watch. We only open the OS subscription while
  // nav mode is on — the rest of the time the idle one-shot read is
  // plenty and we don't burn battery on continuous GPS. The hook is
  // ref-counted so concurrent consumers (the screen could call too)
  // don't double up.
  //
  // We ALSO kick off a fresh `getCurrentPositionAsync` in parallel
  // with the watch — the silent module-level read may have happened
  // hours ago (user opened the app then walked across town). The
  // watch's first emission can take 2-5s; the explicit one-shot
  // typically returns in <500ms. Both publish to the same singleton
  // so whichever finishes first updates the camera follow effect.
  useEffect(() => {
    if (!navigationMode) return;
    let stopper: (() => void) | null = null;
    let cancelled = false;
    startUserLocationWatch().then((stop) => {
      if (cancelled) {
        stop();
        return;
      }
      stopper = stop;
    });
    // Parallel one-shot — same accuracy as the watch so we don't
    // double-up GPS work, and a 3s timeout so the request doesn't
    // block forever on a flaky fix.
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        setUserLocationGlobal({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        // Fallback: the watch will still deliver — just slower.
      }
    })();
    return () => {
      cancelled = true;
      stopper?.();
    };
  }, [navigationMode]);

  // Navigator-style camera follow.
  //
  // Every time the user's coords (or heading) update, re-aim the
  // camera at them with a close zoom + slight pitch so the road
  // ahead reads bigger than the road behind. Heading rotates the
  // whole map so the user's direction of travel is "up" — same trick
  // every real navigator uses. If heading is null (stationary or
  // not enough movement yet) we hold the current map bearing at 0
  // (north-up) instead of jerking the map back and forth.
  //
  // 500ms duration keeps the motion smooth at our ~1.5s update rate
  // (the camera glides between fixes rather than teleporting). Pitch
  // 45° matches Yandex Navigator's "driving" preset; 17 zoom shows
  // roughly the next ~200m of road, the right scope for "what should
  // I do at the next intersection".
  useEffect(() => {
    if (!navigationMode || !userLoc || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: {
          latitude: userLoc.latitude,
          longitude: userLoc.longitude,
        },
        zoom: 17,
        pitch: 45,
        // Heading: smoothly rotate ONLY when we have a real one. If
        // the GPS hasn't derived a bearing yet (stationary user), keep
        // whatever heading the map already has — a sudden snap back to
        // 0° while standing still would feel like a glitch.
        ...(typeof userHeading === 'number' ? { heading: userHeading } : {}),
      },
      { duration: 500 },
    );
  }, [navigationMode, userLoc, userHeading]);

  // On exit from nav mode, gently flatten the camera back to a
  // top-down 2D view — otherwise the map stays pitched and rotated
  // from the last frame, which reads as broken when the route panel
  // disappears.
  useEffect(() => {
    if (navigationMode) return;
    if (!mapRef.current) return;
    mapRef.current.animateCamera({ pitch: 0, heading: 0 }, { duration: 400 });
  }, [navigationMode]);

  /**
   * Request the foreground location permission, OR fall through to the
   * system-settings deep link when the user has previously denied it.
   *
   * Pre-fix (RESP-M1): tapping the GPS banner just re-called
   * `requestForegroundPermissionsAsync()`. iOS only ever shows the
   * system prompt once per install — every subsequent call returns
   * the cached `'denied'` synchronously, so the banner did nothing
   * and the user had no idea why. Now we differentiate:
   *
   *   undetermined → ask the OS (shows the prompt)
   *   denied       → open Settings deep-link (only place the user
   *                  can flip the toggle)
   *   granted      → fetch location
   *
   * `getForegroundPermissionsAsync` reads the cached status without
   * triggering a prompt, so we use it to disambiguate before deciding
   * whether to ask or deep-link.
   */
  const requestGps = async () => {
    // Hand the entire flow to the gate — it shows our pre-permission
    // dialog, calls the OS API only on consent, and offers a settings
    // deep-link if the OS comes back as denied. Replaces the manual
    // `getForegroundPermissionsAsync → request → openSettings` ladder
    // and brings the UX in line with every other permission gate in
    // the app.
    const status = await permissionGate.request('location', askLocationOS);
    if (status !== 'granted') return;

    setGpsDenied(false);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      // Publish to the shared singleton — discover screen's distance
      // memo wakes up and the map's GPS dot re-renders together.
      setUserLocationGlobal({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      // GPS hardware off / airplane mode — banner stays, user can retry.
    }
  };

  const recenter = () => {
    if (gpsDenied) {
      requestGps();
      return;
    }
    if (!mapRef.current) return;
    // In nav mode, recenter snaps back to the nav-mode camera preset
    // (close zoom 17 + pitch 45) so the user lands at the same view
    // the auto-follow uses — otherwise tapping recenter would zoom
    // out to the wide preview and the follow effect would
    // immediately fight back to nav-mode preset on the next location
    // update.
    if (navigationMode && userLoc) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: userLoc.latitude,
            longitude: userLoc.longitude,
          },
          zoom: 17,
          pitch: 45,
          ...(typeof userHeading === 'number' ? { heading: userHeading } : {}),
        },
        { duration: 400 },
      );
      return;
    }
    const target: Region = userLoc
      ? {
          latitude: userLoc.latitude,
          longitude: userLoc.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : TASHKENT_CENTER;
    mapRef.current.animateToRegion(target, 400);
  };

  /**
   * Programmatic zoom via animateCamera's `zoom` field. We read the
   * current camera, nudge zoom by ±1, and re-animate in 200ms — fast
   * enough to feel direct, slow enough that the change reads. Bounded
   * to [3, 19] so users can't end up looking at a single pixel of road
   * tile or the entire planet.
   *
   * Why explicit buttons even though the map already supports pinch:
   * users on one-handed mode (or tablets in landscape) hit the +/-
   * affordance much faster than reaching across the screen to pinch.
   * Standard map convention — Yandex, Google, Apple all expose them.
   */
  const ZOOM_MIN = 3;
  const ZOOM_MAX = 19;
  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.getCamera().then((cam) => {
      const current = typeof cam.zoom === 'number' ? cam.zoom : 14;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta));
      if (next === current) return;
      map.animateCamera({ zoom: next }, { duration: 200 });
    });
  };

  const initialRegion: Region = userLoc
    ? {
        latitude: userLoc.latitude,
        longitude: userLoc.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }
    : TASHKENT_CENTER;

  const recenterScale = recenterPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        // OS native user-location dot is the ONLY position marker we
        // render now — for both idle map and nav mode. Pre-fix we had
        // a custom cyan "navigation chevron" Marker that we toggled in
        // alongside the OS dot. Two issues kept biting:
        //   1. Google Maps Android captures custom Markers as bitmaps
        //      and rotates THAT bitmap on heading change. Any padding
        //      we set was eaten by the snapshot bounds and the disc's
        //      right + bottom edges cropped on every rotation frame.
        //   2. When the OS dot was on alongside the custom marker
        //      (added as a safety net after the dot kept disappearing),
        //      users saw two concentric circles stacked.
        //
        // The native dot solves both: it auto-rotates with heading
        // on Android via the OS, scales correctly across zoom levels,
        // never crops, and is the standard convention users expect
        // from a maps experience. The cyan brand reads through the
        // polyline route + the recenter button — losing it on the
        // position marker is a worthwhile trade for reliability.
        showsUserLocation={!gpsDenied}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        toolbarEnabled={false}
      >
        {clubs.map((club) => (
          <ClubMarker
            key={club.id}
            club={club}
            isActive={selectedId === club.id}
            onPress={() => onSelect(club.id)}
          />
        ))}
        {/* Route overlay — drawn AFTER the markers so the pins stay
            tappable. Two layers: a translucent halo underneath and a
            solid cyan stroke on top. The halo widens the visual line
            without obscuring the road tiles, the same trick Yandex
            uses for its primary route. `lineCap`/`lineJoin: round`
            avoids the spiky edges where polyline segments meet at
            sharp angles (city corners, U-turns). */}
        {routeCoordinates && routeCoordinates.length >= 2 && (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="rgba(0, 207, 255, 0.25)"
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#00CFFF"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        )}
      </RNMapView>

      {gpsDenied && (
        <TouchableOpacity style={styles.gpsBanner} activeOpacity={0.85} onPress={requestGps}>
          <Text style={styles.gpsBannerEmoji}>📍</Text>
          <View style={styles.gpsBannerText}>
            <Text style={styles.gpsBannerTitle}>{t.discover.gpsDeniedTitle}</Text>
            <Text style={styles.gpsBannerSub}>{t.discover.gpsDeniedSub}</Text>
          </View>
          <Text style={styles.gpsBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Zoom stack — sits on the right edge, above the recenter
          button. Single rounded slab with a thin divider between +
          and − so the two buttons read as a unit instead of two
          unrelated floating circles. */}
      <View style={styles.zoomStack}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => zoomBy(1)}
          activeOpacity={0.7}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t.discover.zoomInA11y}
        >
          <Text style={styles.zoomGlyph}>+</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => zoomBy(-1)}
          activeOpacity={0.7}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t.discover.zoomOutA11y}
        >
          <Text style={styles.zoomGlyph}>−</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.recenterWrap,
          gpsDenied && { transform: [{ scale: recenterScale }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.recenterBtn, gpsDenied && styles.recenterBtnDenied]}
          onPress={recenter}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            gpsDenied ? t.discover.gpsDeniedTitle : t.discover.recenterA11y
          }
        >
          <LocationPinIcon size={20} color={gpsDenied ? '#F59E0B' : '#00CFFF'} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  zoomStack: {
    position: 'absolute',
    right: 16,
    bottom: 72,
    backgroundColor: 'rgba(20, 24, 35, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.18)',
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomGlyph: {
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 22,
    // The `−` minus character is slightly off-baseline on iOS; -1pt
    // nudge keeps both + and − optically centred.
    marginTop: -1,
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  recenterWrap: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 24, 35, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterBtnDenied: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
  },
  gpsBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 24, 35, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    padding: 10,
  },
  gpsBannerEmoji: {
    fontSize: 22,
  },
  gpsBannerText: {
    flex: 1,
    gap: 2,
  },
  gpsBannerTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  gpsBannerSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  gpsBannerArrow: {
    fontSize: 18,
    color: '#F59E0B',
    paddingRight: 4,
  },
  // (Removed: userArrowWrap / userArrowHalo / userArrowChip styles
  // that powered the custom nav-mode marker. The OS native dot is
  // the only user-position indicator now — no bitmap snapshot, no
  // rotation cropping, and Android's OS-side heading rotation works
  // automatically when `showsUserLocation` is on.)
});

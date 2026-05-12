export type ClubType = 'pc' | 'ps' | 'mixed';

export interface MapClub {
  id: string;
  name: string;
  type: ClubType;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  pcCount: number;
  hasPSZone: boolean;
  open24h: boolean;
  isOpen: boolean;
  distanceKm: number;
  image: string;
  gallery: string[];
  joined: boolean;
  verified: boolean;
  address: string;
  description: string;
  discountText?: string;
  balance?: number;
}

// MAP_CLUBS was a hardcoded fixture of 8 fake clubs in Tashkent. It's
// gone — every screen that used to import it now calls
// `useDiscoverClubs()` (see `lib/hooks/useDiscoverClubs.ts`) which
// fetches `/mobile/discover/clubs` and adapts the response onto the
// `MapClub` shape below. The interface and map-style constants stay
// here because they're consumed by both the hook and the map view.

export const TASHKENT_CENTER = {
  latitude: 41.3111,
  longitude: 69.2797,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Dark map style for Google Maps (matches Nexora dark theme)
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0E1422' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5A6A85' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0F16' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#1A2540' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#8B95A8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0F2A1A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A2540' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#243152' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2E3D66' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#A0AEC0' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#6B7A99' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06121F' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A5A75' }] },
];

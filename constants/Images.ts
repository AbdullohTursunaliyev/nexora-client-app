// Placeholder uchun internet rasmlar (assetlar tayyor bo'lguncha).
//
// AVATAR: previously pointed to pravatar.cc — every signed-out user's
// device hit a 3rd-party CDN, leaking IP/usage telemetry and adding a
// load-time hop on every screen with a default avatar (FE-H10). The
// data URI below is a 1x1 transparent PNG so consumers can render
// Image without a network call. Real avatar UX should compose with
// `<DefaultAvatar/>` (initial-on-circle) when avatar_url is missing.
export const Images = {
  // Single default avatar used whenever a user hasn't uploaded their
  // own picture. UI-avatars renders a circle with "U" on the app's
  // dark background colour, which gives every avatar slot a real
  // filled image instead of the previous transparent 1×1 PNG (which
  // looked blank against the dark UI). Server-cached, no asset to
  // ship.
  avatar:
    'https://ui-avatars.com/api/?name=User&background=141823&color=00CFFF&size=256&bold=true&format=png',
  clubs: [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80',
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&q=80',
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&q=80',
  ],
  promotion: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  mapPlaceholder: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',

  /**
   * Onboarding hero photography. Pre-redesign these were 400–900px
   * thumbnails meant to sit inside decorative card/orb overlays —
   * the editorial redesign promotes them to full-bleed Full HD hero
   * images, so they're requested at w=1600 with auto-format/quality.
   *
   * Picked for production-app feel:
   *   - heroArena: esports-tournament wide shot with neon lighting →
   *     used as the brand-intro slide. Cinematic and high-energy.
   *   - heroClub: dimly lit gaming-club interior with rows of
   *     monitors → used for the "find clubs near you" slide.
   *   - heroSetup: close-up of a personal gaming desk (RGB
   *     keyboard, headset, monitor) → used for the "book your
   *     seat" / features slide. Reads as "personal seat" not
   *     "tournament floor".
   *
   * Decorative shape overlays (glow circles, building cards, pin
   * floats, brand-label badges, NexoraLogo SVG, per-feature stock
   * thumbnails) were removed alongside this asset upgrade — the
   * photo IS the hero now, not a thumbnail behind chrome.
   */
  onboarding: {
    heroArena:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&q=85&auto=format',
    heroClub:
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1600&q=85&auto=format',
    heroSetup:
      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1600&q=85&auto=format',
  },

  zones: {
    pc: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&q=80',
    vip: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
    ps5: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80',
  },

  tournaments: {
    cs2: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80',
    nightHunters: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
    dota2: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&q=80',
    pubg: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80',
  },
};

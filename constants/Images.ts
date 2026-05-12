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

  onboarding: {
    cyberCity: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&q=80',
    building: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80',
    computer: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400&q=80',
    controller: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400&q=80',
    wallet: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80',
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

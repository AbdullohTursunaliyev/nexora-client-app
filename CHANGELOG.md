# Nexora — Changelog

Tarixiy audit + fix raundlari. Eski round 1-3 uchun [AUDIT.md](./AUDIT.md) ga qarang.
Bu fayl round 4 dan keyingi barcha ishlarni qamrab oladi.

> **Status legendasi**: ✅ Pushed | 🟡 Local-only (push hali kutilmoqda) | 🔵 In progress

---

## Round 10 — Live-screen polish + map bug hunting 🟡

**Date**: 2026-05-12

### Map bug fixes (Discover tab — directions overlay)

1. **User dot disappearing after route is built** — `showsUserLocation` is now always on when GPS is granted (pre-fix it toggled off in nav mode, and the custom arrow didn't render if `userLoc` was null)
2. **Camera focus not on user** — added failsafe `fitToCoordinates` for the `userLoc=null` case + force-fetch `getCurrentPositionAsync` on nav-mode entry so coords are fresh
3. **Static arrow when stationary** — custom arrow now only renders when heading is known (else the OS dot shows alone)
4. **Recenter button in nav mode** — now zooms to nav preset (zoom 17 + pitch 45 + heading) instead of the default wide region
5. **A11y labels** — recenter / zoom in / zoom out — 3 new keys × 3 locales
6. **`tracksViewChanges` removed** — fixes stale-bitmap on newArchEnabled when heading updates

### Home / Bookings / Wallet / Payment polish
- HomeHeader: i18n'd "Mehmon" guest fallback (was hardcoded uz), a11y for avatar + bell buttons
- ClubCard: removed bookmark icon (decorative — favorites tied to joinedClubs), added a11y label
- Bookings tab: silent fail on listUpcoming/listHistory now surfaces a toast, refresh button a11y
- Payment screen: Payme + Click options hidden pre-launch (PSP not wired); empty-state when no methods available
- ClubAddress: silent `Linking.openURL().catch(() => {})` now surfaces a toast, a11y label added
- Team-finder: 2 silent `.catch(() => [])` swallows now toast on failure
- help-support: unused `router` import removed (AI deep-links replaced earlier)

### Verification
- TS clean ✓
- Jest 23 suite / 131 test passing ✓

---

## Round 9 — Soon-gating refer-earn + statistics + avatar URL field removed 🟡

**Date**: 2026-05-12

### Newly gated screens
- `app/refer-earn.tsx` — replaced with `<ComingSoonView />` (rewards backend pending)
- `app/statistics.tsx` — replaced with `<ComingSoonView />` (BE `stats` shape missing on summary endpoint)

### Profile menu
- `refer` row → `soon: true` (dimmed, non-tappable, Soon badge)
- `stats` row → `soon: true`

### Profile-edit
- "Avatar URL" TextInput field removed — users now exclusively pick the image natively (tap avatar → expo-image-picker → multipart upload). The URL paste field was a vestigial pre-camera placeholder; keeping it confused users about which entry point was canonical.
- State variable `avatarUrl` still exists so the save call carries the freshly uploaded URL; only the manual edit affordance is gone.

### i18n (3 locales)
- `soon.referEarn.{title, subtitle}` — "Do'st taklif tez orada" / "Пригласи и получи скоро" / "Refer & earn coming soon"
- `soon.statistics.{title, subtitle}` — "Statistika tez orada" / "Статистика скоро" / "Statistics coming soon"

### Verification
- TS clean ✓
- Jest 23 suite / 131 test passing ✓

---

## Round 8 — Soon-gating finalize: non-tappable badges + other entry points 🟡

**Date**: 2026-05-12
**Scope**: Polish the Round 7 soon-gating per product feedback

### Pattern change
Soon items render as **dimmed non-tappable rows** with a "Soon" badge — tapping them is a no-op (they don't open the placeholder screen). The user gets a clear "this is coming, not available yet" signal at the entry point, with no extra navigation step.

### Profile menu rows (the main list of soon features)
- Icon dimmed (50% opacity), label muted, "Soon" badge replaces the ChevronRight
- Row rendered as `<View>` (not `<TouchableOpacity>`) — tap does nothing
- Items: AI Assistant, Smart Tips, Smart Seat, Smart Queue, Session Invites, Party Booking, Rating

### Profile quick links (top 4 cards)
- Tournaments + Rewards (achievements) cards now render as non-tappable Views with a small "Soon" ribbon in the corner
- Book + Wallet stay live

### Profile loyalty card
- Removed `<TouchableOpacity onPress={/achievements}>` wrapper
- Added "Soon" badge next to the title
- CTA button dimmed (still says label, but visually disabled)

### Active session (`active-session.tsx`)
- `+` top-up button on balance card removed
- "Add balance" ActionRow removed
- Other actions (Extend, Switch Zone, End Session) still live

### MembershipBar component (club details page)
- "Top up" pill removed (the bar now just shows the balance read-only)
- Imports cleaned (router, PlusIcon, TouchableOpacity)

### Help-support (`help-support.tsx`)
- 4 deep-links to `/ai-assistant` replaced with submit-ticket modal opens
  - "Chat with support" → opens submit ticket
  - "Open topic" → opens submit ticket with topic as subject
  - Search query enter → opens submit ticket with query as subject
  - "View all" link removed entirely
- Submit-ticket modal already works end-to-end

### Verification
- TS clean ✓
- Jest 23 suite / 131 test passing ✓

---

## Round 7 — Pre-deploy Soon-gating (12 features) 🟡

**Date**: 2026-05-12
**Scope**: Gate 12 features behind a coming-soon placeholder so v1.0 ships clean

### Yangi reusable component
**`components/common/ComingSoonView.tsx`** — fullscreen placeholder:
- SimpleHeader (same chrome as live screens)
- Icon + halo (per-feature accent colour)
- Title + 1-line subtitle (i18n)
- "Coming soon" badge

### Gated screens (each now ~20-line file using ComingSoonView)

| # | Screen | Why gated |
|---|---|---|
| 1 | `app/ai-assistant.tsx` | LLM integration pending |
| 2 | `app/smart-recommendations.tsx` | ML model needs usage history |
| 3 | `app/smart-seat.tsx` | Ranking scoring not in prod |
| 4 | `app/smart-queue.tsx` | Push notifications not wired |
| 5 | `app/session-invites.tsx` | Push + presence backend pending |
| 6 | `app/party-booking.tsx` | Invite flow needs push |
| 7 | `app/rating.tsx` | Per-game ELO not modelled |
| 8 | `app/tournaments.tsx` + `tournament-details.tsx` | Bracket/schedule/broadcast pending |
| 9 | `app/wallet-topup.tsx` | PSP webhook → balance credit not wired |

### Bonus points (balls) hidden across UI
- `(tabs)/wallet.tsx`: hidden bonus row, top-up `+` button, quick-amount chips, top-up CTA
- `refer-earn.tsx`: hidden "Points earned" stat, full milestones section
- `(tabs)/index.tsx`: hidden `<AiBanner />`
- (Mission claim → still works server-side; reward_bonus simply not displayed)

### Profile menu "Soon" badges
- AI Assistant, Smart Tips, Smart Seat, Smart Queue, Party Booking, Rating, Session Invites
- Items remain tappable — navigate to gated screen showing the placeholder

### i18n (3 locales × 10 keys)
New `soon.{aiAssistant, aiRecommendations, smartSeat, smartQueue, walletTopup, sessionInvites, partyBooking, rating, tournaments, bonusPoints}` + `soon.badgeShort` (Tez orada / Скоро / Soon)

### Verification
- TS clean ✓
- Jest 23 suite / 131 test passing ✓

---

## Round 6 — Camera + Image Picker integration 🟡

**Date**: 2026-05-12
**Scope**: Native camera + image-picker bilan QR scan, avatar upload, club-join QR

### Yangi paketlar
- `expo-camera@~17.0.10` — live QR scanner
- `expo-image-picker@~17.0.11` — galereya + avatar
- `expo-clipboard@~8.0.8` — refer-earn copy/share (Round 5'da o'rnatilgan)
- `expo-constants@~18.0.13` — expo-router peer dependency fix

### Permissions (`app.json`)
- iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSMicrophoneUsageDescription`
- Android: `CAMERA`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`
- Expo plugins: `expo-camera`, `expo-image-picker` ruxsat textlari (uz)

### Yangi reusable komponent
**`components/qr/QrScannerModal.tsx`** — fullscreen QR scanner modal:
- Live `CameraView` (back-facing, faqat QR barcode types)
- Cyan/violet/pink corner viewfinder
- Flash toggle (`enableTorch`)
- Gallery fallback (`scanFromURLAsync` — saqlangan rasmdan QR decode)
- Permission gate (OS prompt → settings deep-link)
- Burst protection (`handledRef` — bir martalik scan)
- Mount-only mode (modal yopilganda kamera teardown)

### Wire qilingan ekranlar
1. **`app/qr-scan.tsx`** — PC QR ochish:
   - Yangi "Kamera bilan skanerlash" CTA
   - Scan → `<pc_id>:<code>` parse → BE submit → active-session
2. **`app/profile-edit.tsx`** — Avatar tanlash:
   - Avatar ring tap'able
   - Galereya → 1:1 kropping → 85% JPEG → BE upload (`/mobile/auth/profile/avatar`)
   - Returned URL avtomatik form'ga set bo'ladi
   - Upload chog'ida spinner overlay
3. **`app/club-join.tsx`** — Klub kodi:
   - "Yoki QR skanerlash" → modal
   - Raw kod yoki `nexora://join?code=NEX12345` parse
   - Scan muvaffaqiyatli → avtomatik join

### i18n (3 til × 12 key)
- `qrScan.scanCta`, `cameraPermTitle/Sub/Cta`, `cameraDenied`, `galleryDenied`, `galleryDecodeFailed`, `alignHint`, `invalidFormat`
- `profileEdit.avatarUploadingHint`, `avatarUploadedToast`, `avatarUploadFailed`, `galleryDenied`

### Verification
- `tsc --noEmit` exit 0 ✓
- `jest` 23 suite / 131 test passing ✓
- Expo bundle: HTTP 200 / 13.1 MB ✓

---

## Round 5 — Deep bug hunt: BE/FE contract mismatches 🟡

**Date**: 2026-05-12
**Scope**: 12 ta shape mismatch (FE→BE wire contractni mos kelmasligi) — runtime crashes + silent 422s

### CRASH bugs (`reviews.map is not a function` family)

| # | Endpoint | BE qaytaradi | FE kutgan | Effekt |
|---|---|---|---|---|
| 1 | `GET /mobile/club/reviews` | `{reviews, mine, can_submit, next_review_at}` | `ClubReview[]` | **Screen crash** (user reported) |
| 2 | `GET /mobile/friends` | `{friends, incoming, outgoing}` | `{friends, pending_requests}` | Incoming requests yo'q ko'rinmas |
| 3 | `GET /mobile/friends/search` | `{items}` | `{users}` | Search natijasi har doim bo'sh |
| 4 | `GET /mobile/friends/invites` | `{incoming, outgoing}` | `{invites}` | Session invites yo'q ko'rinmas |
| 5 | `GET /mobile/pcs/smart-seat` | `{ok, meta, items}` | `{pc, reasoning, alternatives}` | Smart-seat screen crash |
| 10 | `GET /mobile/wallet/cards` | `{items}` | `SavedCard[]` | `.map` crash |
| 11 | `GET /mobile/wallet/transactions` | `{items}` | `Transaction[]` | `.map` crash |

### Silent fail bugs (request body field names — har bir POST 422)

| # | Endpoint | BE kutgan | FE yuborgan |
|---|---|---|---|
| 6a | `POST /mobile/friends/requests` | `{friend_mobile_user_id}` | `{target_user_id}` |
| 6b | `POST /mobile/friends/invites` | `{friend_mobile_user_id, note}` | `{target_user_id, pc_id}` |
| 8 | `POST /mobile/pcs/open` | `{pc_id, code}` | `{qr_code}` |
| 9 | `POST /mobile/client/smart-queue/join` | `{zone_key, notify_on_free}` | `{zone_id}` |
| 12 | `POST .../missions/{code}/claim` (resp) | `{reward_bonus}` | FE `reward` o'qigan |

### O'zgartirilgan fayllar
- `lib/api/services/clubs.ts` — yangi `getClubReviewsResponse()` + back-compat alias
- `lib/api/services/friends.ts` — to'liq qayta yozildi, BE→FE adapter qatlami (5 endpoint)
- `lib/api/services/pcs.ts` — smartSeat shape adapter, openByQr/joinSmartQueue body
- `lib/api/services/wallet.ts` — `{items}` unwrap
- `lib/api/services/client.ts` — `claimMission` `reward_bonus` + `reward` mirror
- `app/club-reviews-list.tsx` — `can_submit` + `next_review_at` ishlatish
- `app/qr-scan.tsx` — `<pc_id>:<code>` parser
- `app/smart-queue.tsx`, `app/smart-seat.tsx` — yangi shape adapter
- Tests yangilandi: `friends.test.ts` (11 test), `pcs.test.ts` (+4 test)

---

## Round 4 — BE hardening round 5: cross-tenant, races, throttles, perf, i18n ✅

**Date**: 2026-05-12 (commit `b5e6021`)
**Status**: ✅ Pushed to `main`

### Security (HIGH)
- Friend search tenant-scoped (`WHERE EXISTS clients` subquery) — cross-tenant enumeration yopildi
- Friend sendRequest tenant scope — spam-friend strangerlarga to'siq
- Referral code: deterministic `base_convert($user_id, 10, 36)` → opaque random Crockford-base32 token (10 char) + lazy backfill + migration
- Tournament re-register: `firstOrCreate` silent team_id ignore → explicit 422 "cancel first"

### Races (HIGH)
- `MobilePcService::smartSeatHold` DB::transaction + lockForUpdate
- `MobilePcService::unbook` DB::transaction + lockForUpdate
- `SaveClubReviewAction::execute` 1-per-month race fix
- `MobileFriendService::invite` null-safe Tenant lookup

### Throttles (MEDIUM)
8 endpoint:
- `/missions/{code}/claim` — 30/min
- `/club/reviews` POST — 5/min
- `/friends/invites` POST + respond — 30/min
- `/pcs/{id}/book` + `party-book` + `rebook-quick` + `smart-seat/hold` — 60/min
- `/smart-queue/join` — 30/min
- `/pcs/open` — 30/min

### Performance (MEDIUM)
- Leaderboard `me` rank — users outside top-50 endi rank ko'radi (single COUNT subquery)
- `MobileQueueService::listForClient` — `zoneSnapshot()` per unique zone (O(3N) → O(3K))
- `MobileTeamController::players` — `pluck('login')` round-trip → `WHERE EXISTS` subquery

### UX (MEDIUM)
- `Notification::markRead` har doim `ok: true` (avval already-read holida `ok: false` → FE error toast)

### LOW
- AI tips + chat stub reply per Accept-Language (uz/ru/en)
- Home feed `level` — total played hours'dan (avval hardcoded 12)

### Migration
- `2026_05_12_130000_add_referral_code_to_mobile_users.php`

---

## Round 3 — FE Polish (rounds tracked separately)

**Date**: 2026-05-10 → 2026-05-12

Hujjat qilingan: [AUDIT.md](./AUDIT.md) #1-#15

Asosiy ishlar:
- Wallet topup idempotency (UI side)
- Help-support: Submit ticket + Remote help wired to BE
- Shadow removal (9+ files)
- Dead onPress handlers wired
- Hardcoded mocks removed (12+ screens)
- i18n hardcoded "so'm" → currencyUnit
- Race conditions FE-side
- Silent error catches → toast.error

### In-app directions feature 🟡
- `lib/util/polyline.ts` — Google polyline decoder
- `lib/util/routing.ts` — OSRM driving route (free, no API key)
- `components/discover/MapView.native.tsx` — `<Polyline>` rendering + camera follow
- Navigator-style real-time GPS tracking (`watchPositionAsync`, heading rotation, pitch 45°)
- Custom user arrow marker
- Smart Seat / club hide other markers when route active

### FE HIGH fixes (round 3 final)
- `refer-earn`: Copy code + Share invite-link wired (Clipboard + Share)
- `booking-success`: 4 buttons wired (Copy ID, Direction, Share, Add-to-Calendar)
- `services`: 3 service-request rows wired to `callStaff`/`reportIssue`
- `wallet` picker: real per-club balance from membership
- `bookings` cards: pass `bookingId`, completed disabled
- `achievements`: gated behind coming-soon placeholder

### FE MED fixes
- Silent error catches → toast.error (5 files)
- `notifications` timestamp relative format ("12m ago" / "May 12")
- `tournament-details` Share button + Schedule/Participants soon placeholders
- `team-chat` Members/Settings tabs soon placeholder
- `rating`, `team-finder`, `smart-rec` dead dropdowns → soon toast
- `active-session` + `services` subtabs Chat/Settings → soon toast
- `statistics` "View all" → bookings
- `formatRouteSummary` i18n meters/km
- `promotions-list` + `PromotionsList` live locale (was hardcoded `'uz'`)

---

## Round 2 — Wallet Topup Idempotency ✅

**Date**: 2026-05-12 (earlier commits)
**Status**: ✅ Pushed

Hujjat qilingan: AUDIT.md #16+ va round 4 commit message

- `MobileWalletController::topup` idempotency-key handling
- Bo'sh `Idempotency-Key` header'da deterministic key synthesis (sha1 of tenant|client|amount|method|60s_window)
- DB::transaction + lockForUpdate + 23505 catch
- Partial unique index migration `(tenant_id, client_id, idempotency_key) WHERE NOT NULL`

---

## Cumulative numbers

| Round | Date | BE files | FE files | Tests added | Status |
|---|---|---|---|---|---|
| 1-3 | 2026-05-10 | ~30 | ~50 | +60 | ✅ Pushed |
| 4 (Wallet idempotency) | 2026-05-12 | 4 | 0 | +3 | ✅ Pushed |
| 5 (BE round 5) | 2026-05-12 | 15 | 0 | 0 (BE tests not run locally) | ✅ Pushed |
| FE polish | 2026-05-12 | 0 | 30+ | +9 | 🟡 Local |
| In-app directions | 2026-05-12 | 0 | 6 | +9 | 🟡 Local |
| Deep bug hunt (round 5) | 2026-05-12 | 0 | 12 | +5 | 🟡 Local |
| Camera + picker | 2026-05-12 | 0 | 6 | 0 | 🟡 Local |
| **Total this session** | — | **19** | **54+** | **+26** | — |

**Final state**:
- TypeScript: clean ✓
- Jest: 23 suite / 131 test passing ✓ (was 21/117 at session start)
- BE commits: ✅ Pushed (round 4 + 5)
- FE commits: 🟡 Local-only (user requested no-push until further notice)

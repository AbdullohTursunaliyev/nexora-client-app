# Nexora — Project Rules

This file pins the conventions we've converged on across the **mobile
app** (this repo) and the **Laravel backend** (`mycafecloud-api`).
Every entry exists because we got it wrong once already — keep them
consistent so we don't regress.

---

## 0. North star — judge every change against these four axes

Before opening an edit, ask:

1. **Best practice** — is this how the React Native / Laravel
   community would solve it? Prefer documented patterns
   (`useCallback` for fetchers, `Promise.allSettled` for parallel
   loads, `firstOrCreate` for idempotent seeds) over clever bespoke
   solutions. If you'd be embarrassed to show a senior the diff,
   rewrite.
2. **Performance** — does the change keep:
   - Initial render under one frame (no expensive sync work in
     render bodies — extract to `useMemo`)?
   - Lists virtualised when they can grow past ~50 rows (`FlatList`,
     not `ScrollView + map`)?
   - Network requests deduped (module-level cache like
     `useDiscoverClubs`, `RefreshControl` reuses the same fetcher)?
   - Re-renders bounded (memoised context values, `useCallback` for
     identity-stable handlers)?
3. **Design standards** — does it use:
   - The tokens in `constants/Colors.ts` and `constants/Fonts.ts`?
   - The shared `<Button>` / `<AppDialog>` / `<Toast>` /
     `<SimpleHeader>` components, not one-off variants?
   - The pill-shape, dark-card, cyan-accent language consistently?
   - Card heights that stay the same row-to-row (see ClubCard's
     fixed-height highlight slot)?
4. **UI/UX friendliness** — does the user:
   - Know what's happening (loading spinners with optional
     `loadingLabel`, toasts for success, dialogs for confirms)?
   - See real content immediately (skeleton loaders > blank screens;
     empty states with info > silent gaps — see Hard Rule #2)?
   - Have a way back from every state (pull-to-refresh, retry on
     error toasts, modal backdrop tap = cancel)?
   - Get text in their selected language (uz / ru / en — never
     ship UI in English-only)?
   - Tap targets ≥ 44 pt (iOS HIG) — verify with `hitSlop` on
     icons under 38 px?

If a change clears all four, it's good to land. If it fails any one,
either fix that gap or document why it's acceptable (an `AUDIT.md`
defer note works) in the same diff.

---

## 0.5. Code quality bar — every diff ships at v1.0

There is no "I'll come back and tidy it later". Every change lands as
the **final** version — production-grade, fully wired, fully styled,
fully tested. The codebase has been bitten by half-measures (mock
data we never replaced, TODOs we never closed, "for now" comments
that became forever) — so the bar is now strict:

**Before committing any diff, the following must be true:**

1. **No half-measures.** No "stub", no "for now", no "we'll do this
   properly later". If the right thing takes more time, take that
   time. If it's truly out of scope, file it in `AUDIT.md` with a
   defer note — don't ship a placeholder.

2. **No leftover process artefacts:**
   - No `TODO` / `FIXME` / `XXX` / `HACK` comments in committed code.
     If something must be tracked, it goes in `AUDIT.md`.
   - No commented-out code. Either delete it or extract it to a real
     function with a real docstring.
   - No unused imports / dead exports / orphaned files. Run
     `npx tsc --noEmit` then grep for the symbol — if nothing points
     to it, delete it.
   - No `console.log` left in `app/` or `components/`. Use
     `console.warn` only at error boundaries (see
     `useDiscoverClubs`'s catch).

3. **No type escapes:**
   - No `as any`. Cast through `as unknown as T` only when the
     adapter shape genuinely diverges, and document the divergence
     in a JSDoc comment.
   - No `@ts-ignore` / `@ts-expect-error` without a one-line reason
     and an `AUDIT.md` reference.
   - Prefer named interface types over inline anonymous shapes.

4. **No magic numbers / strings in screens:**
   - Colours → `constants/Colors.ts`. Spacings → inline once is fine,
     but if it appears > 3 times across files extract a token.
   - User-visible strings → `lib/i18n/translations.ts` in all 3
     locales (Hard Rule #5).
   - URLs → never hardcoded in screens; always go through
     `lib/api/services/*`.

5. **Every fetch has all three branches** (Hard Rule #2):
   - `loading` → skeleton / spinner with optional `loadingLabel`.
   - `error` or empty result → info-card with copy and (when
     applicable) a recovery CTA.
   - `data` → content.

   Promise.allSettled for parallel loads; never `await` two
   independent fetches sequentially in `useEffect`.

6. **Every new public service method has a Jest test.** Files in
   `lib/api/services/*` are 1:1 with `__tests__/services/*`. Tests
   pin the URL, the body shape, and the response decoding — they
   don't simulate the backend. Coverage stays at 100% for the
   services folder.

7. **Migrations are immutable.** Once a migration lands on Railway,
   never edit it — add a new `YYYY_MM_DD_*.php` that patches forward.
   Use the one-shot reseed pattern from section 8 for data fixes.
   Editing a deployed migration is silent destruction (it re-runs on
   fresh installs but skips on existing DBs).

8. **No secrets in commits.** No tokens, no API keys, no passwords.
   `.env` is gitignored — keep it that way. If a token leaks into
   git history, rotate immediately and rewrite the offending commit
   (`git filter-repo`, not `git rebase`).

9. **Every commit message says why.** "Fix bug" is not a commit
   message. "Fix tournament register SQL crash on PostgreSQL —
   lockForUpdate() + count() is forbidden, tournament row lock
   already serialises the section" is.

10. **Verify before merge:**
    ```bash
    npx tsc --noEmit -p tsconfig.json    # 0 errors
    npx jest                              # 117/117 pass
    curl … /index.bundle                  # Metro 200
    bash .claude/e2e.sh                   # if BE changed, 35/35 pass
    ```
    If any step fails, the diff isn't ready.

---

## 1. Architecture overview

| Layer | Stack | Path |
|---|---|---|
| Mobile FE | Expo (SDK 54) + Expo Router + React Native 0.81 | `app/`, `components/`, `lib/` |
| Backend | Laravel 11 + PostgreSQL + Redis | `../Workspace/mycafecloud-api-main/` |
| Deploy | Railway (auto-deploy on `main`) | `api-production-cae59.up.railway.app/api` |
| Demo data | `DemoDataSeeder` + reseed migrations | `database/seeders/`, `database/migrations/` |

The mobile app talks to BE over HTTPS only. Token state lives in
`expo-secure-store` (Keystore / Keychain), not AsyncStorage.

---

## 2. Hard rules (never bend)

1. **No mock data in screens.** Every visible value comes from an API
   or a documented default (e.g. `Images.avatar` for empty avatars).
   `lib/data/` holds *types and style constants only* — never fixture
   arrays.
2. **Never leave a slot empty — there must always be something
   informative in its place.** Bare empty space is a render bug
   waiting to be reported. Every slot that *can* be empty needs a
   fallback. The lookup table:

   | Slot is empty because… | Show instead |
   |---|---|
   | API list returned `[]` (legitimate "no items yet") | Info-card with icon + title + sub explaining what will appear, plus a CTA if the user can do anything ("Klubga qo'shilish") |
   | API list returned `[]` because the user can't act on it (e.g. "all clubs" tab) | Info-card with icon + title + sub *without* a CTA — explanatory copy only |
   | API field is `null` / `''` and FE has a sensible default | Use the documented default constant. Never render `null` as text. Examples: `Images.avatar`, `t.home.levelDefault` ("Yangi" / "Новичок" / "Newcomer"), `rating > 0 ? rating : '—'`, `distanceKm > 0 ? '{d} km' : null` |
   | Fetch is in flight | Skeleton placeholder, not an empty `<View>`. Cards use `SkeletonClubCard` / `SkeletonPromotionCard` patterns |
   | Optional metadata (discount, schedule, rating) is missing | Either pick the next-best signal (ClubCard cycles discount → 24/7 → PS5 → "✓ Tasdiqlangan") OR omit the row entirely and let the parent collapse — never reserve space with `<View />` placeholders |
   | A required ID / param is missing on a detail screen | Empty-state error card with a back/retry button — don't render a half-broken layout |
   | The user hasn't picked a sub-tab yet | Auto-select the first valid option so the screen never renders unselected |

   **Implementation rule of thumb:** every screen ends with `if
   (loading) return <Skeleton/>; if (!data) return <EmptyCard/>;
   return <Content/>;` — three branches, never two.
3. **No shadow on buttons.** The `<Button>` component is intentionally
   flat. Cards / dialogs / bottom bars keep neutral black shadow for
   depth — that's container chrome, not button decoration.
4. **`Alert.alert` is forbidden in `app/` and `components/`.** Use
   `useDialog()` from `components/common/AppDialog.tsx`. Same for the
   OS permission prompt — gate with `usePermissionGate()` first.
5. **Every visible string is in `lib/i18n/translations.ts` in all
   three locales** (uz / ru / en). Missing keys are compile errors
   thanks to the strict `Dict` shape.
6. **117/117 jest tests must pass + 0 TypeScript errors before
   committing.** Run `npx jest && npx tsc --noEmit -p tsconfig.json`.

---

## 3. Data fetching contract

**Two auth scopes** on the backend:

| Scope | Token | Header sent by | URL examples |
|---|---|---|---|
| `mobile.auth` | `mobile_token` | Most user-level routes | `/mobile/auth/*`, `/mobile/home/feed`, `/mobile/client/notifications`, `/mobile/discover/*`, `/mobile/friends/*`, `/mobile/help/*`, `/mobile/ai/*` |
| `client.auth` | `client_token` | Tenant-scoped routes | `/mobile/client/summary`, `/mobile/club/*`, `/mobile/pcs/*`, `/mobile/wallet/*`, `/mobile/tournaments/*`, `/mobile/leaderboard`, `/mobile/services/*`, `/mobile/teams/*`, `/mobile/bookings/*`, `/mobile/promotions` |

**`lib/api/client.ts` rules:**

- The request interceptor picks the right token via `needsClientToken(url)`,
  which scans `CLIENT_AUTH_PREFIXES`. **Every new tenant-scoped route
  must be added to that list** or you'll silently send the wrong token
  and either 401 the user out or leak the wrong scope.
- The response interceptor classifies 401s into three buckets — see
  the comment block in `client.ts`. Don't add a "blanket logout on
  401" path; it caused the "logged out when I navigate" bug twice.
- `Accept-Language` is auto-attached from `getCurrentLocale()`.
- `Idempotency-Key` UUIDv4 attached on every POST/PUT/PATCH/DELETE.

**Calling pattern in screens:**

```ts
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(true);

const load = useCallback(async (surfaceSpinner = false) => {
  if (surfaceSpinner) setRefreshing(true);
  try {
    setData(await api.fetchSomething().catch(() => null));
  } finally {
    if (surfaceSpinner) setRefreshing(false);
    else setLoading(false);
  }
}, [/* fetch deps */]);

useEffect(() => { void load(); }, [load]);
```

Every data-driven screen exposes the same fetch function through
`RefreshControl onRefresh={() => load(true)}` so pull-to-refresh works
everywhere.

---

## 4. Auth flow

```
boot → tokens.loadFromStorage() → me()
        succeeded → ensureTenantSession(clubs, storedTenantId)
        failed    → resetAuth() (clears tokens + state + AsyncStorage)

login()/register() → ensureTenantSession(clubs, currentTenantId)
                     ↑ auto-picks clubs[0] if there's no preferred match
                     ↑ silent on failure (request interceptor handles)
```

**Why `ensureTenantSession` exists:** without it, a user whose
`mobile_token` is fresh but `client_token` is null trips the
tenant-scoped 401 path on the home tab and gets bounced back to /login.
Always call it after every flow that sets a new mobile_token.

`resetAuth` is the only path that takes a user back to /login except
explicit `logout()`. The 401-listener is heavily gated — see the
"category 2 vs 3" comment in `client.ts`.

---

## 5. Component / design conventions

### Buttons
- `<Button>` from `components/common/Button.tsx` is the single source.
- Five variants: `primary`, `secondary`, `outline`, `danger`, `ghost`.
- Always pill-shaped (`borderRadius: 999`).
- **No shadow / elevation** — flat against the background.
- Pass `loadingLabel` for slow round-trips so the user sees progress text alongside the spinner.

### Cards
- `<ClubCard>` always renders the highlight row (consistent height
  across discount / no-discount).
- Highlight priority: discount → 24/7 → PS zone → "✓ Tasdiqlangan"
  fallback. Never leave the slot empty.
- Top-rated (rating ≥ 4) gets a gold pill on the rating chip.
- Bookmark icon overlays the cover image (top-right), not the body.

### Dialogs / toasts / sheets
- `useDialog()` returns `{ confirm, alert }`. Promise-based.
- `useToast()` for transient (auto-dismiss) messages.
- Bottom-sheet pattern: drag handle, dark `#141823` card, full-width buttons,
  safe-area aware `paddingBottom` (`Math.max(insets.bottom + 16, 20)`).

### Header
- `<SimpleHeader title=... />` with `numberOfLines={1}` +
  `ellipsizeMode="tail"` on the title so long Russian strings don't
  wrap.

### Bottom bars
- Sticky bars must compute `paddingBottom: Math.max(insets.bottom, 12)`.
- Two-button rows split 50/50 via `flex: 1` slots.
- iOS shadow above + Android `elevation: 12` for the lift, neutral black.

### Pull-to-refresh
- Every API-driven screen wires `<RefreshControl tintColor="#00CFFF">`.
- Hook `useDiscoverClubs()` exposes `refresh()` for screens that
  consume it; reuse that to avoid duplicate fetches.

### Color tokens
```
Background: #0B0F16  Card: #141823  Row: #1A1F2B  Border: rgba(255,255,255,0.05)
Primary cyan: #00CFFF  Purple: #7C3AED  Gold rating: #F59E0B
Success: #22C55E  Danger: #EF4444  Warning: #F59E0B
Muted text: #8B95A8  Subtitle text: #6B7280
```

Use `Colors.*` from `constants/Colors.ts`. Don't hardcode hex outside
that file.

### Fonts
- `Inter` only. Weights: `regular`, `medium`, `semiBold`, `bold`.
- Use `Fonts.inter.*` from `constants/Fonts.ts`.
- `Orbitron` for the step counters in the booking flow (the only
  approved exception).

---

## 6. i18n

- `Dict` interface in `translations.ts` is the contract. Adding a key
  means adding it in all three locales — TypeScript will refuse the
  build otherwise.
- Cyclical translation keys live next to their consumer screen
  (`t.login.*`, `t.bookings.*`, `t.components.*`).
- Always `numberOfLines={1}` on Cyrillic-heavy slots — Russian is the
  longest of our three locales and breaks layouts fastest.
- Static labels like `'CS2'`, `'PUBG'`, currency amounts ("12 PC") are
  not translated.

`getCurrentLocale()` in `lib/i18n/currentLocale.ts` mirrors the
provider into module scope so the axios `Accept-Language` interceptor
can read it without React context.

---

## 7. Mobile app structure

```
app/
├── _layout.tsx           Root providers + Stack registration
├── index.tsx             Splash + auth routing
├── (tabs)/
│   ├── _layout.tsx       Tabs + AuthGate
│   ├── index.tsx         Home
│   ├── discover.tsx      Map / list
│   ├── bookings.tsx
│   ├── wallet.tsx
│   └── profile.tsx
├── login.tsx             Login + register + language picker
├── club-details.tsx, club-preview.tsx, club-join.tsx, clubs-list.tsx, clubs-switch.tsx
├── tournament-details.tsx, tournaments.tsx, team-finder.tsx, team-chat.tsx
├── payment.tsx, seat-select.tsx, time-select.tsx, zone-select.tsx, zone-switch.tsx
├── booking-success.tsx, active-session.tsx
├── wallet-topup.tsx
├── friends-list.tsx, friend-requests.tsx, session-invites.tsx
├── notifications.tsx, help-support.tsx, settings.tsx
├── statistics.tsx, achievements.tsx, rating.tsx, favorites.tsx
├── party-booking.tsx, smart-seat.tsx, smart-queue.tsx
├── ai-assistant.tsx, smart-recommendations.tsx
├── profile-edit.tsx, language-select.tsx, refer-earn.tsx
└── qr-scan.tsx

components/
├── common/               Button, Toast, AppDialog, SimpleHeader, KeyboardSafeView, FadeInView, Skeleton*
├── home/                 HomeHeader, ClubsTabs, ClubCard, PromotionsList, PromotionCard, AiBanner
├── club/                 ClubHero, ClubInfo, ClubBottomBar, ClubGallery, ExpandableDescription, MembershipBar
├── discover/             MapView (native + web), MapHeader, FilterChips, FilterSheet, CitySheet, DiscoverList, SelectedClubCard, ViewToggle, MapActions
├── seat/                 Seat, SeatHeader, SeatBottomBar
├── time/                 StepHeader (booking flow header)
├── zone/                 ZoneCard, ZoneSelectHeader
└── icons/                Single-file SVG/Lucide wrappers — one per icon

lib/
├── api/
│   ├── client.ts         Axios + interceptors + token manager
│   ├── secureStorage.ts  expo-secure-store + AsyncStorage fallback
│   ├── config.ts         EXPO_PUBLIC_API_URL + STORAGE_KEYS
│   ├── types.ts          Shared response shapes
│   └── services/         One file per BE resource (auth, clubs, pcs, …)
├── hooks/                Cross-screen hooks (useDiscoverClubs, usePermissionGate)
├── i18n/
│   ├── translations.ts   Single source of truth (Dict + 3 locales)
│   ├── LocaleProvider.tsx Context + persistence
│   └── currentLocale.ts   Module mirror for axios
├── state/                Per-domain hooks (useSelectedClub, useSelectedSeat, …)
├── data/                 Types + map style only — no fixture arrays
└── utils/                Pure helpers (formatPrice, safeRoute)

store/
└── AuthProvider.tsx      Single source for user / clubs / tokens

constants/
├── Colors.ts             Palette tokens
├── Fonts.ts              Inter + Orbitron families
└── Images.ts             Bundled images + default avatar URL

__tests__/                Jest service-layer tests (117 across 21 suites)
.claude/
└── e2e.sh                Live API smoke (35 endpoints — run after major BE changes)
```

---

## 8. Backend conventions (`mycafecloud-api`)

- One mobile controller per resource: `app/Http/Controllers/Api/Mobile*Controller.php`.
- Wrap responses in `MobilePayloadResource(...)` — the FE's
  `wrapEnvelope` normalises both wrapped and unwrapped shapes.
- Validation messages should localise via Laravel's translator
  eventually; the FE bandages known Russian strings in
  `getErrorMessage`'s `KNOWN_ERROR_PATTERNS`.
- Models go in `app/Models/`; use `$fillable` (never `$guarded`)
  for tables that hold money or tenant identity (`Client`, `Tenant`,
  `MobileToken`, `ClientToken`).
- Demo data lives in `database/seeders/DemoDataSeeder.php`. Every row
  uses `firstOrCreate` / `updateOrCreate` so re-runs are no-ops.
- Need to reseed an already-deployed DB? Drop a one-shot migration:
  ```php
  return new class extends Migration {
      public function up(): void { (new DemoDataSeeder())->run(); }
      public function down(): void {}
  };
  ```
- **PostgreSQL gotcha**: never combine `lockForUpdate()` with `count()`.
  PG forbids `FOR UPDATE` on aggregates — wrap the count outside the
  lock or rely on a parent row's lock. The tournament-register fix
  in `MobileTournamentController` is the worked example.
- Auth tokens: `mobile_tokens` (account) and `client_tokens` (tenant).
  Both expire — see `SEC-M7` notes. `mobile_token` rehashes on
  successful login if cost changed (Day-N).

---

## 9. Testing

- Service-layer Jest tests live under `__tests__/services/`, one file
  per service. They mock `lib/api/client` and assert URL + body
  shapes — not BE behaviour. Don't write component tests here; the
  jest setup is node-only on purpose.
- `__tests__/{secureStorage, formatPrice}.test.ts` cover utilities.
- `__tests__/client.test.ts` pins the `wrapEnvelope` contract.
- Live API smoke: `bash .claude/e2e.sh` after any backend change.
  35 assertions across auth → clubs → bookings → tournaments → wallet
  → teams → notifications → help → logout.

Coverage target: **117/117 tests passing** before any commit. Failed
ts-jest suites on first run are usually cold-cache flakes — re-run
once.

---

## 10. Deployment

- Backend pushes to `main` → Railway auto-redeploys (~2 min).
- New BE seed data goes through a one-shot reseed migration (see
  section 8) so it lands on Railway prod automatically.
- Mobile FE: `npx expo start --lan` from `mobile-app/`. URL is
  `exp://{LAN_IP}:8081`. LAN IP changes per Wi-Fi — re-share when
  switching networks.
- Production builds via **EAS** — that's what skips Expo Go's
  "needs permissions for fine location" pre-prompt.

---

## 11. Code style

- TypeScript strict everywhere. `tsc --noEmit` must be clean.
- Comments document the **why**, not the **what**:
  ```ts
  // Pre-fix (BE-H7) every tenant got hardcoded Tashkent center
  // coords. The discover map collapsed all pins on top of each
  // other. Now we fan out around city centre when lat/lng is null.
  ```
- Reference audit findings (`FE-H4`, `BE-C3`, `SEC-M5`) and Day-N
  fixes — they map back to `AUDIT.md` entries.
- Prefer `useCallback` for fetchers passed into deps, `useMemo` for
  derived lists.
- One-purpose files. If a screen needs > 600 LOC, extract its
  domain-specific subcomponents into `components/{domain}/`.

---

## 12. When in doubt

1. **Run every change through the section-0 axes.** Best practice,
   performance, design standards, UX friendliness — if all four
   aren't clean, fix the gap or document the defer.
2. **Don't add mock data**, ever. Wire it to API or show an
   empty-state info card with copy explaining the gap (see Hard Rule
   #2 — the gaps-to-fallbacks table).
3. **Don't leave any slot blank.** Avatar missing → default image.
   Rating missing → '—' or hide. List empty → info-card. Loading →
   skeleton. The user must never see a hole.
4. **Don't add shadows to buttons.** Every retry of this loses the
   user's trust.
5. **Don't bypass `useDialog` / `useToast`.** Native `Alert.alert`
   ignores our dark theme and renders OS chrome.
6. **Don't 401-on-everything.** The interceptor's 3-category logic
   exists because a single blanket logout broke the app twice.
7. **Don't merge with failing tests** — even if the failure looks
   unrelated, ts-jest sometimes catches real bugs (the NBSP bug in
   `formatPrice` was discovered this way).

If a rule feels wrong, update this file in the same PR.

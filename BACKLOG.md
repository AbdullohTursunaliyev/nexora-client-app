# Nexora — Backlog

Hozir kutilayotgan ishlar, kelajak featurelar, deferred audit items, va known gaps.

Hujjat sanasi: 2026-05-12

---

## 🔜 Pre-deploy Soon-gated (Round 7)

Quyidagi 12 ta feature **`<ComingSoonView />`** placeholder ortida. Route va menyu yo'naltirilgan, lekin original UI vaqtincha o'chirilgan. Har bir feature uchun keyingi sprintda live ishga tushiriladi.

| # | Feature | Screen | Restore qachon |
|---|---|---|---|
| 1 | Nexora AI assistant | `app/ai-assistant.tsx` | LLM integration tayyor bo'lganda |
| 2 | AI recommendations | `app/smart-recommendations.tsx` | ML model + usage history |
| 3 | Smart Seat AI | `app/smart-seat.tsx` | Ranking scoring backend |
| 4 | Smart Queue | `app/smart-queue.tsx` | Push notifications (FCM/APNs) |
| 5 | Session Invites | `app/session-invites.tsx` | Push + presence backend |
| 6 | Party Booking | `app/party-booking.tsx` | Invite flow + push |
| 7 | Rating | `app/rating.tsx` | Per-game ELO model |
| 8 | Tournaments | `app/tournaments.tsx` + `tournament-details.tsx` | Bracket / schedule / broadcast |
| 9 | Wallet Top-up | `app/wallet-topup.tsx` | Payme/Click PSP webhook → credit |
| 10 | Bonus points (balls) | wallet + refer-earn UI | Rewards backend |
| 11 | Achievements / Rewards | `app/achievements.tsx` | Rewards backend (per memo) |
| 12 | Settings: Preferences/Privacy/Payment | `app/settings.tsx` rows | BE endpoints |

### Restore protokoli (har bir feature uchun)
1. BE endpoint(lari) tayyor → push to main
2. FE `app/<feature>.tsx` — `ComingSoonView` o'rniga live komponent qaytarish (git history)
3. `(tabs)/profile.tsx` — `soon: true` flagini olib tashlash
4. Test (TS + jest + manual flow)
5. CHANGELOG'ga "Re-launched" yozuv qo'shish
6. BACKLOG'dan o'chirish

> **Priority legendasi**: 🔴 P0 (blocker) | 🟠 P1 (next sprint) | 🟡 P2 (later) | 🔵 P3 (nice-to-have)

---

## 🚧 Developing (qisman ishlaydi — to'liq bo'lish kerak)

### 1. Favorites heart icon 🟠 P1
- **Holat**: UI bor, lekin tapping decorative — favorites ro'yxatga qo'shmaydi/olib tashlamaydi
- **Kerak**: BE `/mobile/client/favorites` POST/DELETE endpointlari
- **FE**: club-card'da heart icon optimistik toggle + service call
- **Time**: ~1 day (BE + FE)

### 2. Club FeatureGrid 🟡 P2
- **Holat**: barcha klublar uchun bir xil 4 ta feature ko'rinadi (cafe / PS / wifi / premium)
- **Kerak**: BE tenant'ga `features: string[]` qaytarish (per-club)
- **FE**: dynamic render
- **Time**: ~4h (BE column add + FE adapt)

### 3. Booking history details 🟡 P2
- **Holat**: completed bookings tap → disabled
- **Kerak**: Yangi `app/booking-details.tsx` screen (QR + time + total + cancel/refund tarixi)
- **Time**: ~6h (yangi screen + route)

### 4. ClientSummary `stats` + `active_session` 🟡 P2
- **Holat**: FE `summary?.stats?.total_hours` o'qiydi, lekin BE bu fieldni qaytarmaydi → `—` placeholder
- **Kerak**: `MobileClientSummaryService::buildSummary` ga `stats` + `active_session` qo'shish
- **Time**: ~3h

---

## 🔜 Coming soon (BE endpoint kerak)

### 5. Settings sub-screens 🟠 P1
- Preferences, Privacy, Payment — hozir "tez orada" toast
- BE endpointlari:
  - `GET/PATCH /mobile/client/preferences` (notifications on/off, language, dark mode override)
  - `GET/PATCH /mobile/client/privacy` (profile visibility, friend request from anyone, etc.)
  - `GET/PATCH /mobile/client/payment-methods` (saved Payme/Click tokens)
- **Time**: ~2 days (BE + FE 3 screens)

### 6. Team chat attachment 🟡 P2
- Image-picker o'rnatilgan, BE endpoint yo'q
- Kerak: `POST /mobile/teams/{id}/messages/attachment` (multipart upload)
- BE'da `team_messages` jadvaliga `attachment_url` column
- FE chat bubble image preview
- **Time**: ~1.5 days

### 7. Achievements / Rewards Center 🟡 P2 (per memo)
- Memo: "Mukofotlar markazi va do'koni hozir yo'q"
- Holat: gated coming-soon placeholder
- BE full design kerak (badges, missions extension, rewards store)
- **Time**: 1-2 weeks (full feature)

### 8. Tournament Schedule + Participants tabs 🟡 P2
- BE `/mobile/tournaments/{id}/schedule` va `.../participants` endpointlari yo'q
- Placeholder coming-soon hozir ko'rsatiladi
- **Time**: ~1 day (BE + FE)

### 9. Team chat Members + Settings tabs 🟡 P2
- BE'da team member list / settings endpointlari kerak
- Placeholder hozir ko'rsatiladi
- **Time**: ~1 day

### 10. Live operator chat (Help & Support) 🔵 P3
- Hozir static FAQ + ticket form
- Real-time chat uchun: Intercom/Zendesk SDK yoki o'z websocket
- **Time**: 3-5 days (3rd-party SDK)

### 11. Voice call (team chat / operator) 🔵 P3
- Twilio/Agora SDK kerak
- **Time**: 1 week

---

## 🐛 Known bugs / gaps (real bugs but not blockers)

### 12. AI Assistant assistant-only-reply 🟡 P2
- BE returns hardcoded stub reply ("Tushunarli! Tez orada batafsil tavsiyalar tayyorlayman")
- Real LLM integration kerak (Anthropic / OpenAI)
- Audit P2 #2

### 13. Friend search rate limit 🟡 P2
- `/mobile/friends/search` throttle hali yo'q
- Brute-force enumeration uchun foydalanish mumkin (sekin, lekin imkonsiz emas)
- Quick fix: `throttle:30,1`

### 14. PC unbook tenant scope verification 🔵 P3
- `MobilePcService::unbook` booking topa olmasa `ok: true` qaytaradi (silent no-op)
- 404 to'g'riroq bo'lardi — lekin minor UX
- Audit M follow-up

### 15. Tournament COUNT(*) inside lockForUpdate transaction 🔵 P3
- PG forbids `SELECT count(*) ... FOR UPDATE` (aggregate cannot be row-locked)
- Hozir tournament row lock + separate count — to'g'ri ishlaydi
- Comment'da tushuntirilgan, action kerakmas

### 16. Carbon::parse try/catch 🟡 P2
- Bir nechta joyda `Carbon::parse($startAtRaw)` try/catch'siz
- Malformed input throw qiladi → 500 error
- `'date'` validator o'tib ketadigan stringlar (`"0000-00-00"`) Carbon'ni crash qiladi
- Quick fix: explicit try/catch → 422

### 17. Booking diff sign warning 🔵 P3
- `MobileBookingController:127` — `end < start` data corruption case'da `max(1, ...)` masks
- Defensible, lekin log warning yaxshi bo'lardi

---

## 📋 Defer'd audit items (round 1-3 dan, hali action olinmagan)

11 ta item, AUDIT.md'da "Defer qilingan" section'da ko'rsatilgan. Hammasi documented design choice yoki low-priority refactor:

- **BE-M11** Pc.zone column drop (legacy column dropping migration risk)
- **BE-L6** FormRequest refactor (consistency, not bug)
- **RESP-M2** FlatList migration (ScrollView'larni FlatList'ga)
- **RESP-M3** Dynamic Type review (iOS accessibility text scaling)
- **RESP-M4** `expo-image` (better caching, image format support)
- **RESP-M5** Tablet design (iPad layout optimization)
- **RESP-L2** RTL (right-to-left languages — out of scope)
- **FE-L2** Universal pattern (cross-platform abstraction)
- **FE-L5** Mock chat (will be replaced with real chat)
- **SEC-L2** 2FA (SMS provider needed)
- **SEC-L3** Certificate pinning (production deploy only)

---

## 🚀 Production deploy checklist

### Pre-deploy
- [x] All HIGH/MEDIUM audit items closed
- [x] TS clean + jest 23/131 passing
- [x] Idempotency on all state-changing POSTs
- [x] Throttles on all sensitive endpoints
- [x] Cross-tenant access control (IDOR prevention)
- [x] Camera + image picker permissions configured
- [ ] **Real PSP integration** (Payme/Click webhook → wallet credit)
- [ ] **Production API URL** — `EXPO_PUBLIC_API_URL` set to https://api.nexora.uz
- [ ] **HTTPS guard** — reject non-HTTPS BASE_URL in production
- [ ] **EAS Build** — iOS + Android production builds
- [ ] **App Store + Google Play** metadata, screenshots, privacy policy
- [ ] **Sentry / crashlytics** integration
- [ ] **App Store review** (1-2 weeks)

### Post-deploy
- [ ] Monitor PSP webhook success rate
- [ ] Watch crash analytics first 48h
- [ ] User feedback channel (support.nexora.uz)
- [ ] Onboarding analytics (drop-off in registration flow)

---

## 💡 Nice-to-have (future)

- 🔵 **Dark/Light mode toggle** — currently dark-only
- 🔵 **Onboarding tour** — slideshow on first launch
- 🔵 **Promo notification deep-links** — universal links to in-app screens
- 🔵 **Receipts download** — PDF generation BE service
- 🔵 **Calendar integration native** — `expo-calendar` instead of Google Calendar URL
- 🔵 **Push notifications** — `expo-notifications` + FCM/APNs server
- 🔵 **Apple/Google Sign-in** — currently login/password only
- 🔵 **Tablet-optimised UI** — currently phone-only layout
- 🔵 **Offline mode** — basic browsing cached

---

## Time estimates summary

| Category | Items | Total time |
|---|---|---|
| Developing | 4 | ~2.5 days |
| Coming soon (BE work) | 7 | ~3 weeks |
| Known bugs | 6 | ~2 days |
| Defer'd audit | 11 | ~1 week (low priority) |
| Production checklist | 6 | ~1-2 weeks |
| Nice-to-have | 9 | ~3-4 weeks |

**Critical path for v1.0 production**: PSP integration + Production API URL + EAS Build + App Store review ≈ **2-3 weeks**

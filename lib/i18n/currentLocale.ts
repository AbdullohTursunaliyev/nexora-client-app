/**
 * Module-scoped mirror of the user's current locale.
 *
 * Why this exists:
 *   The axios request interceptor in `lib/api/client.ts` runs outside
 *   the React tree — it can't call `useLocale()` to find out which
 *   language the user picked. We need that information to set the
 *   `Accept-Language` header so the backend can localize validation
 *   errors / generic messages.
 *
 *   `LocaleProvider` writes here on mount and on every change, and
 *   `client.ts` reads here when building each request. The fallback
 *   matches `LocaleProvider`'s own default so a request fired before
 *   the provider boots still ships a sane header.
 */

import type { Locale } from './translations';

let currentLocale: Locale = 'uz';

export function setCurrentLocale(next: Locale): void {
  currentLocale = next;
}

export function getCurrentLocale(): Locale {
  return currentLocale;
}

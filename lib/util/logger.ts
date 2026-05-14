/**
 * Tiny logger wrapper — routes every dev-only diagnostic through a
 * single chokepoint so release builds don't ship `console.warn`
 * noise. Pre-fix the app had ~8 bare `console.warn` calls scattered
 * across `app/`, `lib/`, and `components/` that fired against Metro
 * in dev AND against the user's device in production. Audit L3.
 *
 * Usage: `logWarn('[component] something happened', err)` — same
 * call shape as `console.warn`, just gated on `__DEV__` so a
 * production build emits nothing.
 *
 * Why a wrapper and not just `if (__DEV__) console.warn(...)`
 * inline at each call site:
 *   - 8 call sites today, more to come. Single source of truth for
 *     "should we silence logs?"
 *   - Easy to swap in a structured logger / Sentry breadcrumb later
 *     without touching every call site.
 *   - `__DEV__` is a global injected by Metro — referencing it in
 *     every file would force a `declare const __DEV__: boolean;`
 *     ambient anyway. One central declaration keeps types tidy.
 */

declare const __DEV__: boolean;

export function logWarn(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function logError(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

export function logInfo(...args: unknown[]): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

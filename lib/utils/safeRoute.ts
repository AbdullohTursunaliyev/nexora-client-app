/**
 * Whitelist-based deep-link sanitiser.
 *
 * Backend-supplied routes (e.g. `MobileNotification.action_url`) end up
 * being passed to `router.push(...)` or `Linking.openURL(...)`. Without
 * a sanity check, a compromised admin or a future bug could push
 * `mailto:`, `tel:`, `gameclub://...?evil=...`, or arbitrary in-app
 * routes the screen wasn't designed to receive (SEC-M8).
 *
 * Allowed shapes:
 *   - In-app routes that start with `/` (e.g. `/notifications`,
 *     `/tournament-details?id=12`).
 *   - `https://` external links — the FE can decide whether to open
 *     them in WebView or system browser.
 *
 * Anything else returns null. Caller renders the notification but
 * skips the CTA action.
 */
export function sanitizeRoute(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;

  // Reject any colon before the first `/` or before a query — kills
  // `mailto:`, `tel:`, `javascript:`, `data:`, custom schemes.
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx >= 0) {
    if (trimmed.startsWith('https://')) return trimmed;
    return null;
  }

  // Must be an in-app absolute path.
  if (!trimmed.startsWith('/')) return null;

  // Reject path traversal-ish patterns just to be safe.
  if (trimmed.includes('//')) return null;

  return trimmed;
}

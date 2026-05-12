import { useEffect, useState } from 'react';

/**
 * Module-level singleton for the unread-notification count.
 *
 * Why a singleton instead of "each screen fetches its own count":
 *
 * The home tab's bell badge and the notifications screen's filtered
 * list both derive from the same backend state — but the user mutates
 * it (tap-to-read, mark-all-read) on the notifications screen and
 * immediately bounces back to home. Pre-fix the bell stayed stale
 * because:
 *   1. The mutation POST is fire-and-forget, so BE state takes ~50ms
 *      to settle.
 *   2. HomeHeader's `useFocusEffect` re-fetched `/notifications` the
 *      INSTANT focus returned to home — racing the BE write and
 *      receiving the pre-read count back.
 *   3. The badge then displayed the stale count until the next
 *      pull-to-refresh.
 *
 * This singleton fixes the race by giving the notifications screen a
 * way to optimistically push the new count INTO the same memory cell
 * the badge reads from. The badge updates instantly; the BE-driven
 * refetch on next focus reconciles if anything drifted.
 *
 * Read with the `useUnreadCount()` hook; write with `setUnreadCount()`
 * or the `decrementUnread()` / `clearUnread()` helpers. All callers
 * see the same value — there's no per-component duplication.
 *
 * ## Stale-write protection
 *
 * After a user-initiated mutation (mark-all-read, tap-to-read) we
 * remember the wall-clock time of the change. For a short grace
 * window any external `setUnreadCount(higher)` is REJECTED — that's
 * almost always the home-tab's focus-driven refetch racing the BE
 * write and getting the pre-mutation count back. Without this guard
 * the bell would briefly hide, then re-show the stale count, then
 * hide again ~1s later when the BE caught up. Confusing pulse.
 *
 * The grace window is short (2.5s) so a real "new notification
 * arrived" push isn't suppressed for long; lower values resume
 * being applied immediately so we still UNDER-count optimistically.
 */

let currentUnread = 0;
let lastUserMutatedAt = 0;
/**
 * Grace window during which a higher remote value is ignored as stale.
 *
 * Sized for the worst BE we've observed: markAllRead POST → BE processes
 * → listNotifications GET returning the new state. Some Railway-hosted
 * Laravel instances take ~3-4s end-to-end under load before a subsequent
 * GET reads the new value. 5s gives generous headroom; combined with the
 * `useFocusEffect` skip below, the user almost never sees the bell flicker
 * back up.
 */
const STALE_WRITE_WINDOW_MS = 5_000;
const listeners = new Set<(n: number) => void>();

function notify(): void {
  for (const cb of listeners) {
    try {
      cb(currentUnread);
    } catch {
      // A buggy subscriber must not tear down others.
    }
  }
}

/**
 * Overwrite the count from an authoritative source (a `/notifications`
 * fetch). If the user recently mutated optimistically AND the incoming
 * value is HIGHER than what we currently hold, we skip the write — see
 * the stale-write docblock above. Equal or lower remote values are
 * always honoured.
 */
export function setUnreadCount(next: number): void {
  const safe = Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0;
  if (safe === currentUnread) return;

  const elapsedSinceMutate = Date.now() - lastUserMutatedAt;
  if (safe > currentUnread && elapsedSinceMutate < STALE_WRITE_WINDOW_MS) {
    // Likely a stale remote fetch racing our optimistic mutation.
    // Silently drop and trust the local value for now.
    return;
  }

  currentUnread = safe;
  notify();
}

/**
 * Optimistic decrement — call after a single tap-to-read flips one
 * notification's read state locally. Clamped at zero so a missed
 * fetch can't push it negative. Marks the mutation timestamp so the
 * next BE-driven setUnreadCount can't race it.
 */
export function decrementUnread(by: number = 1): void {
  const next = Math.max(0, currentUnread - by);
  lastUserMutatedAt = Date.now();
  if (next === currentUnread) return;
  currentUnread = next;
  notify();
}

/** Mark-all-read shortcut. Same end-state as `setUnreadCount(0)`. */
export function clearUnread(): void {
  lastUserMutatedAt = Date.now();
  if (currentUnread === 0) return;
  currentUnread = 0;
  notify();
}

/** Cheap reader for non-React callers (tests, debug). */
export function getUnreadCount(): number {
  return currentUnread;
}

/**
 * How many ms have elapsed since the last user-initiated mutation
 * (clearUnread / decrementUnread). HomeHeader consults this to decide
 * whether its focus-driven refetch should run at all — if the user
 * JUST marked everything read on /notifications, there's no point
 * round-tripping the BE for a value we already know, especially since
 * the BE might still be processing the markAllRead POST.
 */
export function msSinceLastUnreadMutation(): number {
  if (lastUserMutatedAt === 0) return Number.POSITIVE_INFINITY;
  return Date.now() - lastUserMutatedAt;
}

/**
 * Subscribe + re-render hook. Returns the live count; updates on
 * every singleton mutation. Components mount, attach, and unmount
 * cleanly — the Set guarantees no leak.
 */
export function useUnreadCount(): number {
  const [count, setCount] = useState(currentUnread);
  useEffect(() => {
    const cb = (n: number) => setCount(n);
    listeners.add(cb);
    // Re-sync on mount — the singleton may have changed between
    // the initial `useState` and the effect commit.
    setCount(currentUnread);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return count;
}

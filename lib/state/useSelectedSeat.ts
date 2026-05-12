import { useState, useEffect, useCallback } from 'react';

interface SeatSelection {
  /** Display label, e.g. "A01" or operator-defined "VIP-1". */
  label: string;
  /**
   * Backend pc_id the label maps to. NULL when the picked cell is a
   * layout placeholder (no PC installed yet) — payment.tsx blocks
   * those, but the hook keeps the type honest.
   */
  pcId: number | null;
}

type SeatMap = Record<string, SeatSelection>;

/**
 * Selected-seat state — module-level singleton, in-memory only.
 *
 * Pre-fix this used per-component `useState`, so seat-select wrote the
 * pick into ITS state and payment.tsx instantiated a fresh `{}` and
 * always saw `seatId = null`. End result: every booking confirm
 * branched into the "seat unavailable" error path because payment
 * couldn't find the seat the user just picked one screen ago.
 *
 * The singleton fixes that: both screens subscribe to the same map,
 * keyed by zone id, so the pick travels with the user through the
 * flow without going through router params (which would have meant
 * serializing the pick through expo-router's search-string layer for
 * no real reason).
 *
 * Stored shape changed (audit follow-up): we now keep both the display
 * `label` (used by the breadcrumb + summary line) AND the backend
 * `pc_id` it maps to. Pre-fix payment.tsx looked the pc_id up by
 * running `listPcs().find(p => p.code === seatId)` — that worked when
 * the FE invented seat codes ("A01") that loosely matched PC codes,
 * but broke the moment the operator-defined cell label (e.g. "VIP-1")
 * diverged from the PC's `code` field (often "PC-1" / "STD-3" /
 * whatever the CP-side admin typed). Tracking both fields up-front
 * removes the post-hoc lookup and the failure mode that came with it.
 *
 * No AsyncStorage: each visit to seat-select is expected to be a fresh
 * pick (per the original intent), so persistence would only cause
 * "leftover from yesterday" UX bugs.
 */

let currentSeatMap: SeatMap = {};
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

/**
 * Hard-reset the seat map. Called from `clearBookingSelections()` so a
 * successful booking doesn't leave the user's seat highlighted when
 * they start a fresh flow.
 */
export function resetSelectedSeat(): void {
  if (Object.keys(currentSeatMap).length === 0) return;
  currentSeatMap = {};
  notify();
}

export function useSelectedSeat(zoneId: string | null) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const selection = zoneId ? currentSeatMap[zoneId] ?? null : null;
  const seatId = selection?.label ?? null;
  const pcId = selection?.pcId ?? null;

  const select = useCallback(
    (label: string | null, pcId?: number | null) => {
      if (!zoneId) return;
      const next = { ...currentSeatMap };
      if (label) {
        next[zoneId] = { label, pcId: pcId ?? null };
      } else {
        delete next[zoneId];
      }
      currentSeatMap = next;
      notify();
    },
    [zoneId],
  );

  return { seatId, pcId, select, ready: true };
}

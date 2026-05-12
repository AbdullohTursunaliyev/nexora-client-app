import { resetSelectedSeat } from './useSelectedSeat';
import { resetSelectedZone } from './useSelectedZone';

/**
 * One-shot reset for the booking flow's in-memory singletons. Call this
 * after the user lands on booking-success (or whenever the flow is
 * abandoned) so the next zone-select → seat-select → payment journey
 * doesn't start with stale selections.
 *
 * The selections are intentionally NOT persisted across app launches,
 * so app boot already starts clean — this helper only matters within
 * a single session.
 */
export function clearBookingSelections(): void {
  resetSelectedZone();
  resetSelectedSeat();
}

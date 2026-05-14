import ComingSoonView from '../components/common/ComingSoonView';
import SwitchIcon from '../components/icons/SwitchIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * /zone-switch — pre-fix this screen pretended to extend a live
 * session or upgrade the user to a different zone, but it never
 * called any BE endpoint and just `router.push('/seat-select')`'d
 * the user back into the new-booking funnel. From the user's point
 * of view they tapped "Extend / switch zone" → walked through a
 * fake form → ended up booking a NEW seat rather than modifying
 * their active session. No money moved, no session was extended.
 *
 * Plus the hardcoded options included `zone: 'premium'`, which the
 * seat-select zone resolver couldn't match → silent fallback to the
 * tenant's first zone → wrong layout rendered.
 *
 * The BE has no "extend session" or "switch zone" route today. Until
 * it does, we gate this screen behind ComingSoonView so the entry
 * points on active-session don't drop the user into a Potemkin form.
 * Audit findings H2 + H3.
 *
 * Restore the real implementation in one commit once the BE ships:
 *   - `POST /mobile/session/extend` with `{minutes}` body
 *   - `POST /mobile/session/switch-zone` with `{target_pc_id}`
 * (or equivalent — whatever the operator-side billing engine
 * exposes).
 */
export default function ZoneSwitchScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.zoneSwitch.headerTitle}
      title={t.zoneSwitch.headerTitle}
      subtitle={t.common.comingSoon}
      Icon={SwitchIcon}
      accent="#00CFFF"
    />
  );
}

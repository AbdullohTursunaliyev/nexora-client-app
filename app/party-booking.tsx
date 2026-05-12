import ComingSoonView from '../components/common/ComingSoonView';
import PartyIcon from '../components/icons/PartyIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Party booking — multi-seat reservation + friend invites in one
 * flow. Gated coming-soon: the BE party-book endpoint exists and
 * works, but the FE invite-friends-to-the-party UX needs push
 * notifications + acceptance flow that aren't ready yet. We'll
 * restore the original implementation when push lands.
 */
export default function PartyBookingScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.partyBooking.headerTitle}
      title={t.soon.partyBooking.title}
      subtitle={t.soon.partyBooking.subtitle}
      Icon={PartyIcon}
      accent="#FF34E0"
    />
  );
}

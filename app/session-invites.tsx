import ComingSoonView from '../components/common/ComingSoonView';
import MailIcon from '../components/icons/MailIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Session invites — one-tap invite of friends to a live session.
 * Gated coming-soon because real-time presence + push notifs aren't
 * wired. The BE has an invite event model already; the FE list +
 * accept/reject flow is what we'll restore when push lands.
 */
export default function SessionInvitesScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.sessionInvites.headerTitle}
      title={t.soon.sessionInvites.title}
      subtitle={t.soon.sessionInvites.subtitle}
      Icon={MailIcon}
      accent="#7C3AED"
    />
  );
}

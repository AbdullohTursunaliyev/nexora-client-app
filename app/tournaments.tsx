import ComingSoonView from '../components/common/ComingSoonView';
import TrophyIcon from '../components/icons/TrophyIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Tournaments listing — gated coming-soon. Registration flow works
 * end-to-end on the BE (with all the race + idempotency fixes from
 * audit round 5), but the bracket / schedule / live-broadcast
 * features that complete the tournaments experience are not yet
 * ready. We gate the index AND the detail screen so users don't
 * register for tournaments they can't actually watch unfold.
 */
export default function TournamentsScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.tournaments.headerTitle}
      title={t.soon.tournaments.title}
      subtitle={t.soon.tournaments.subtitle}
      Icon={TrophyIcon}
      accent="#F59E0B"
    />
  );
}

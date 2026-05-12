import ComingSoonView from '../components/common/ComingSoonView';
import TrophyIcon from '../components/icons/TrophyIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Tournament details — gated coming-soon. See `tournaments.tsx` for
 * the full rationale. Route preserved so registration deep-links
 * from the future BE don't 404.
 */
export default function TournamentDetailsScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.tournamentDetails.headerTitle}
      title={t.soon.tournaments.title}
      subtitle={t.soon.tournaments.subtitle}
      Icon={TrophyIcon}
      accent="#F59E0B"
    />
  );
}

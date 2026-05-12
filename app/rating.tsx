import ComingSoonView from '../components/common/ComingSoonView';
import TrophyIcon from '../components/icons/TrophyIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Rating / leaderboard — gated coming-soon. The BE has a working
 * leaderboard endpoint (we hardened it in round 5 with the `me`-
 * rank query), but the FE expects per-game / per-region filtering
 * + ELO-style score that the BE doesn't yet support end-to-end.
 * Original FE retained in git history for when we resume.
 */
export default function RatingScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.rating.headerTitle}
      title={t.soon.rating.title}
      subtitle={t.soon.rating.subtitle}
      Icon={TrophyIcon}
      accent="#F59E0B"
    />
  );
}

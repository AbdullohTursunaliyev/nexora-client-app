import ComingSoonView from '../components/common/ComingSoonView';
import GiftIcon from '../components/icons/GiftIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Refer & earn — gated coming-soon. The screen depends on the
 * bonus-points / rewards backend that hasn't launched yet (rewards
 * memo). Until that BE wiring lands the screen renders the
 * `<ComingSoonView />` placeholder; route + nav entry stay so the
 * future implementation drops straight into this file.
 */
export default function ReferEarnScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.referEarn.headerTitle}
      title={t.soon.referEarn.title}
      subtitle={t.soon.referEarn.subtitle}
      Icon={GiftIcon}
      accent="#FF34E0"
    />
  );
}

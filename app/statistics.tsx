import ComingSoonView from '../components/common/ComingSoonView';
import ChartIcon from '../components/icons/ChartIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Personal statistics — gated coming-soon. The BE's
 * `/client/summary` payload doesn't include the `stats` shape the
 * UI expected (sessions count, total hours, total spent), so the
 * screen rendered mostly "—" placeholders. Gating it here keeps
 * the route alive while the BE catches up. When the stats fields
 * ship on the summary endpoint we restore the original UI in this
 * file from git history.
 */
export default function StatisticsScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.statistics.headerTitle}
      title={t.soon.statistics.title}
      subtitle={t.soon.statistics.subtitle}
      Icon={ChartIcon}
      accent="#3B82F6"
    />
  );
}

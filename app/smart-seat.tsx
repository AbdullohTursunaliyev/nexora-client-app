import ComingSoonView from '../components/common/ComingSoonView';
import BrainIcon from '../components/icons/BrainIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Smart Seat — AI-picked PC suggestion. Gated coming-soon until
 * the ranking model is wired. Original implementation backed a
 * BE endpoint that returned a thin items list; full ML scoring
 * (latency, peripherals, neighbour density) isn't in production yet.
 */
export default function SmartSeatScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.smartSeat.headerTitle}
      title={t.soon.smartSeat.title}
      subtitle={t.soon.smartSeat.subtitle}
      Icon={BrainIcon}
      accent="#00CFFF"
    />
  );
}

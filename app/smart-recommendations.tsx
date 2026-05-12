import ComingSoonView from '../components/common/ComingSoonView';
import BrainIcon from '../components/icons/BrainIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Smart / AI Recommendations — gated as "coming soon".
 *
 * Pre-fix the screen rendered hardcoded zone + time suggestions from
 * a static BE payload. Real ML-based recommendations need a usage-
 * history dataset we don't have at launch. The screen is now gated;
 * the route + nav entry remain so the future implementation can
 * drop straight into this file.
 */
export default function SmartRecommendationsScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.smartRec.headerTitle}
      title={t.soon.aiRecommendations.title}
      subtitle={t.soon.aiRecommendations.subtitle}
      Icon={BrainIcon}
      accent="#00CFFF"
    />
  );
}

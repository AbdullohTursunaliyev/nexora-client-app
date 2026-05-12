import ComingSoonView from '../components/common/ComingSoonView';
import RobotIcon from '../components/icons/RobotIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Nexora AI Assistant — gated as "coming soon" pre-launch.
 *
 * Pre-fix the screen rendered a stub chat with hardcoded assistant
 * replies (BE returns a placeholder until a real LLM is wired). To
 * avoid shipping fake AI to production users, the screen is now
 * gated behind the `<ComingSoonView />` placeholder. The route + nav
 * entry stay so deep-links don't 404; when the LLM integration lands
 * we restore the chat UI in this file.
 */
export default function AiAssistantScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.aiAssistant.name}
      title={t.soon.aiAssistant.title}
      subtitle={t.soon.aiAssistant.subtitle}
      Icon={RobotIcon}
      accent="#7C3AED"
    />
  );
}

import ComingSoonView from '../components/common/ComingSoonView';
import HourglassIcon from '../components/icons/HourglassIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Smart Queue — virtual queue with push notification when a PC
 * frees up. Gated coming-soon because the notification side
 * (expo-notifications + APNs/FCM server) isn't wired. The queue
 * data model itself exists on the BE; we keep the route so the
 * eventual UI lands here.
 */
export default function SmartQueueScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.smartQueue.headerTitle}
      title={t.soon.smartQueue.title}
      subtitle={t.soon.smartQueue.subtitle}
      Icon={HourglassIcon}
      accent="#00CFFF"
    />
  );
}

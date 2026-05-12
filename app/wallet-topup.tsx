import ComingSoonView from '../components/common/ComingSoonView';
import CardIcon from '../components/icons/CardIcon';
import { useT } from '../lib/i18n/LocaleProvider';

/**
 * Wallet top-up — gated coming-soon. Pre-fix the FE collected an
 * amount + method and POSTed `/wallet/topup`, which on the BE
 * created a pending transaction + handed back a Payme/Click
 * redirect URL. The PSP integration (webhook → balance credit) is
 * not yet wired end-to-end, so we don't expose the in-app top-up
 * path to users — they top up at the club's till for now.
 *
 * The wallet tab itself remains live (shows balance, transactions);
 * we just gate the "+ Top up" button and this destination screen.
 */
export default function WalletTopupScreen() {
  const t = useT();
  return (
    <ComingSoonView
      headerTitle={t.walletTopup.headerTitle}
      title={t.soon.walletTopup.title}
      subtitle={t.soon.walletTopup.subtitle}
      Icon={CardIcon}
      accent="#22C55E"
    />
  );
}

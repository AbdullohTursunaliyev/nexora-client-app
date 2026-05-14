import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import WalletIcon from '../icons/WalletIcon';
import { useT } from '../../lib/i18n/LocaleProvider';

interface Props {
  /** Per-tenant sum balance. Never null per BE shape — pass 0 instead. */
  balance: number;
  /**
   * Per-tenant bonus pot, separate from the cash balance. Operators
   * credit this for promotions / loyalty / first-booking gifts.
   * Optional because callers from older code paths don't pass it; the
   * row gracefully collapses when undefined or 0.
   */
  bonus?: number;
  /**
   * Optional club label shown above the balance amount. Surfacing the
   * club name turns the strip from "your balance" into "your balance
   * AT THIS CLUB", which is the actual mental model — balances are
   * scoped per-tenant and the user might be looking at one club while
   * having a wallet at another.
   */
  clubName?: string;
}

function formatSum(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/**
 * Membership balance strip on the club-details screen.
 *
 * Pre-fix this was a thin row with just "Klubdagi balansingiz" + a
 * sum. Now upgraded to a richer card:
 *   - Cyan→violet gradient slab (subtle 8% opacity) so it stands out
 *     from the surrounding info chips without competing with the
 *     hero image above
 *   - Wallet glyph in a circular badge on the left, matching the
 *     wallet tab's iconography
 *   - Two-row text block: club-scoped label on top, large sum on bottom
 *   - Bonus pill on the right when the user has a non-zero bonus pot —
 *     amber accent so it reads as "extra" rather than "real money"
 *
 * The "Top up" pill is intentionally absent — the wallet-topup PSP
 * integration hasn't shipped yet and the home / wallet screens still
 * gate top-up behind the "soon" state. Restore as a right-aligned
 * action when the BE endpoint goes live.
 */
export default function MembershipBar({ balance, bonus, clubName }: Props) {
  const t = useT();
  const hasBonus = typeof bonus === 'number' && bonus > 0;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(0, 207, 255, 0.14)', 'rgba(124, 58, 237, 0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <WalletIcon size={18} color="#00CFFF" />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.label} numberOfLines={1}>
              {clubName
                ? `${t.components.membershipBalance} · ${clubName}`
                : t.components.membershipBalance}
            </Text>
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {formatSum(balance)} {t.common.currencyUnit}
            </Text>
          </View>
          {hasBonus && (
            <View style={styles.bonusPill}>
              <Text style={styles.bonusLabel} numberOfLines={1}>
                {t.walletScreen.bonusLabel}
              </Text>
              <Text style={styles.bonusValue} numberOfLines={1}>
                +{formatSum(bonus!)}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer wrap holds the rounded corners + border. Gradient sits
  // INSIDE so the gradient's corners are clipped cleanly by the
  // wrap's overflow:hidden. Pre-fix the border lived on the gradient
  // directly and rendered a 1px hairline mismatch on Android where
  // the gradient layer is composited slightly differently.
  wrap: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.22)',
  },
  gradient: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 207, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    letterSpacing: 0.1,
  },
  value: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  // Bonus pill — amber-tinted so it reads as "extra credit" rather
  // than competing with the cyan main balance. Only shows when there
  // IS a bonus pot to display.
  bonusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
    alignItems: 'center',
    gap: 1,
  },
  bonusLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 9.5,
    color: '#F59E0B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bonusValue: {
    fontFamily: Fonts.inter.bold,
    fontSize: 12,
    color: '#F59E0B',
    letterSpacing: -0.1,
  },
});

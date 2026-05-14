import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import WalletIcon from '../components/icons/WalletIcon';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import GiftIcon from '../components/icons/GiftIcon';
import TrophyIcon from '../components/icons/TrophyIcon';
import CoinIcon from '../components/icons/CoinIcon';
import CashIcon from '../components/icons/CashIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as walletApi from '../lib/api/services/wallet';
import type { Transaction, TransactionType } from '../lib/api/services/wallet';

type FilterKey = 'all' | 'topups' | 'bonuses' | 'charges';

type IconCmp = React.ComponentType<{ size?: number; color?: string }>;

/**
 * /transaction-history — chronological list of every wallet operation
 * for the active club.
 *
 * Pre-fix the Settings screen pointed the "Bitim tarixi / История
 * транзакций / Transaction history" row at `/(tabs)/bookings`, which
 * is the RESERVATION list — not the money-in/out log the row name
 * promised. Users tapping it landed on bookings and were (rightly)
 * confused. This screen calls `GET /mobile/wallet/transactions` and
 * renders the real transaction feed: topups, cashback, package buys,
 * subscription charges, rank/mission bonuses, manual charges, refunds.
 *
 * Filter chips at the top let the user narrow to the most common
 * lookups:
 *   - All        → unfiltered
 *   - Top-ups    → just `type === 'topup'`
 *   - Bonuses    → cashback + tier + mission bonuses (any positive credit
 *                  that isn't a topup)
 *   - Charges    → debits (package, subscription, charge, refund-outgoing)
 *
 * Empty state nudges the user toward `/wallet-topup` — the most common
 * "what do I do next" after seeing zero history.
 */
export default function TransactionHistoryScreen() {
  const t = useT();
  const toast = useToast();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    try {
      // 100 is the BE-enforced ceiling on the `?limit=` param. Going
      // higher just clamps server-side; lower (e.g. 30) would force a
      // pagination follow-up endpoint we don't ship yet. 100 covers
      // most clients comfortably for the first six months of history.
      const data = await walletApi.listTransactions(100);
      setTxns(data);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setTxns([]);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Group every BE transaction type into a UI bucket so the filter
  // chips work consistently regardless of which specific subtypes
  // exist in this user's history.
  const bucketOf = (type: TransactionType): FilterKey => {
    if (type === 'topup') return 'topups';
    if (type === 'bonus' || type === 'tier_bonus' || type === 'mission_bonus') {
      return 'bonuses';
    }
    // Treat every other known debit + unknowns as "charges". Better to
    // surface unfamiliar types under a generic bucket than to hide
    // them — a row with no filter chip would be invisible.
    return 'charges';
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return txns;
    return txns.filter((tx) => bucketOf(tx.type) === filter);
  }, [filter, txns]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t.transactionHistory.filterAll },
    { key: 'topups', label: t.transactionHistory.filterTopups },
    { key: 'bonuses', label: t.transactionHistory.filterBonuses },
    { key: 'charges', label: t.transactionHistory.filterCharges },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SimpleHeader title={t.transactionHistory.headerTitle} />

      {/* Filter chips — fixed-height shell so the row never claims
          more vertical space than its content. Same pattern as the
          notifications screen's tabsShell. */}
      <View style={styles.chipsShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map(({ key, label }) => {
            const isActive = key === filter;
            return (
              <Pressable
                key={key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <EmptyState labels={t} onTopup={() => router.push('/wallet-topup')} />
        ) : (
          filtered.map((tx) => <TxRow key={tx.id} tx={tx} labels={t} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TxRowProps {
  tx: Transaction;
  labels: ReturnType<typeof useT>;
}

/**
 * Per-row card — left tinted icon, type label + ISO timestamp, right
 * signed amount.
 *
 * Sign convention: topups + cashback + tier/mission bonuses + refunds
 * are credits (green, leading `+`). Package buys, subscriptions, and
 * generic charges are debits (red, leading `−`). Unknown types fall
 * back to neutral grey + the raw BE amount.
 */
function TxRow({ tx, labels }: TxRowProps) {
  const meta = mapTransaction(tx.type, labels);
  const dateLabel = (() => {
    const d = new Date(tx.created_at);
    if (Number.isNaN(d.getTime())) return tx.created_at;
    return d.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  const signed = formatSignedAmount(tx.amount, meta.direction);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}1F` }]}>
        <meta.Icon size={18} color={meta.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {meta.label}
        </Text>
        {!!tx.description && (
          <Text style={styles.rowDesc} numberOfLines={1}>
            {tx.description}
          </Text>
        )}
        <Text style={styles.rowDate}>{dateLabel}</Text>
      </View>
      <Text style={[styles.amount, { color: meta.amountColor }]}>{signed}</Text>
    </View>
  );
}

interface EmptyStateProps {
  labels: ReturnType<typeof useT>;
  onTopup: () => void;
}

function EmptyState({ labels, onTopup }: EmptyStateProps) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <WalletIcon size={28} color="#00CFFF" />
      </View>
      <Text style={styles.emptyTitle}>{labels.transactionHistory.emptyTitle}</Text>
      <Text style={styles.emptySub}>{labels.transactionHistory.emptySub}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.emptyCta}
        onPress={onTopup}
        accessibilityRole="button"
        accessibilityLabel={labels.transactionHistory.topupCta}
      >
        <PlusCircleIcon size={16} color="#0B0F16" />
        <Text style={styles.emptyCtaText}>{labels.transactionHistory.topupCta}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface TxMeta {
  label: string;
  Icon: IconCmp;
  color: string;
  amountColor: string;
  direction: 'credit' | 'debit' | 'neutral';
}

/**
 * Map a BE `ClientTransaction.type` value to its display label + visual
 * style + sign direction. Defensive: unknown types fall through to a
 * neutral "Other" row so a future BE-added type doesn't crash the list.
 */
function mapTransaction(
  type: TransactionType,
  labels: ReturnType<typeof useT>,
): TxMeta {
  switch (type) {
    case 'topup':
      return {
        label: labels.transactionHistory.typeTopup,
        Icon: PlusCircleIcon,
        color: '#22C55E',
        amountColor: '#22C55E',
        direction: 'credit',
      };
    case 'bonus':
      return {
        label: labels.transactionHistory.typeBonus,
        Icon: GiftIcon,
        color: '#A78BFA',
        amountColor: '#22C55E',
        direction: 'credit',
      };
    case 'package':
      return {
        label: labels.transactionHistory.typePackage,
        Icon: CoinIcon,
        color: '#F59E0B',
        amountColor: '#EF4444',
        direction: 'debit',
      };
    case 'subscription':
      return {
        label: labels.transactionHistory.typeSubscription,
        Icon: CashIcon,
        color: '#00CFFF',
        amountColor: '#EF4444',
        direction: 'debit',
      };
    case 'tier_bonus':
      return {
        label: labels.transactionHistory.typeTierBonus,
        Icon: TrophyIcon,
        color: '#F59E0B',
        amountColor: '#22C55E',
        direction: 'credit',
      };
    case 'mission_bonus':
      return {
        label: labels.transactionHistory.typeMissionBonus,
        Icon: TrophyIcon,
        color: '#7C3AED',
        amountColor: '#22C55E',
        direction: 'credit',
      };
    case 'refund':
      return {
        label: labels.transactionHistory.typeRefund,
        Icon: PlusCircleIcon,
        color: '#00CFFF',
        amountColor: '#22C55E',
        direction: 'credit',
      };
    case 'charge':
      return {
        label: labels.transactionHistory.typeCharge,
        Icon: CashIcon,
        color: '#EF4444',
        amountColor: '#EF4444',
        direction: 'debit',
      };
    default:
      // Unknown type — show a neutral row with the raw BE label as a
      // fallback so the user at least sees that SOMETHING happened on
      // that date instead of a silent gap in their history.
      return {
        label: labels.transactionHistory.typeOther,
        Icon: WalletIcon,
        color: '#8B95A8',
        amountColor: Colors.text,
        direction: 'neutral',
      };
  }
}

/**
 * Format the row's amount with a leading sign. Credits get `+`, debits
 * get `−` (Unicode minus, not hyphen-minus — looks better and avoids a
 * weird mixed-character feel against the BE-formatted thousand
 * separators). Neutral rows show the raw amount.
 *
 * The amount itself uses ru-RU grouping (1 234) since the entire app
 * already formats currency that way for sum-style sums.
 */
function formatSignedAmount(amount: number, direction: TxMeta['direction']): string {
  const abs = Math.abs(amount).toLocaleString('ru-RU').replace(/,/g, ' ');
  if (direction === 'credit') return `+${abs}`;
  if (direction === 'debit') return `−${abs}`;
  return abs;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  chipsShell: {
    height: 46,
    marginBottom: 4,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#141823',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderColor: 'rgba(0, 207, 255, 0.45)',
  },
  chipText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12.5,
    color: '#8B95A8',
  },
  chipTextActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  rowDesc: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  rowDate: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14.5,
    letterSpacing: -0.3,
  },
  emptyCard: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#0B0F16',
  },
});

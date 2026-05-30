import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import SimpleHeader from '../components/common/SimpleHeader';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import CardIcon from '../components/icons/CardIcon';
import CheckIcon from '../components/icons/CheckIcon';
import LockIcon from '../components/icons/LockIcon';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import { useAuth } from '../store/AuthProvider';
import * as walletApi from '../lib/api/services/wallet';
import type { PaymentMethod, TopupOrder } from '../lib/api/services/wallet';

/** SUM minimum enforced by the BE; mirror it client-side to fail fast. */
const MIN_AMOUNT = 1000;
/** Quick-pick chips. Stored as raw SUM ints so the math stays exact. */
const AMOUNT_CHIPS = [10000, 20000, 50000, 100000] as const;
/** Poll cadence after the PSP page closes — every 2.5s, up to ~6 tries. */
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_TRIES = 6;

/** ru-RU grouping with non-breaking → regular spaces, app-wide convention. */
function formatSum(value: number): string {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/**
 * Per-provider display metadata. Names are brand strings (not localised);
 * the sub-label + a11y copy come from translations. Accent colours match
 * the wallet tab's PaymentMethodCard so the two surfaces read as siblings.
 */
function useProviderMeta(): Record<
  PaymentMethod,
  { name: string; letter: string; accent: string; sub: string }
> {
  const t = useT();
  return useMemo(
    () => ({
      payme: {
        name: 'Payme',
        letter: 'P',
        accent: '#26C6F8',
        sub: t.walletTopup.methodPaymeSub,
      },
      click: {
        name: 'Click',
        letter: 'C',
        accent: '#22C55E',
        sub: t.walletTopup.methodClickSub,
      },
    }),
    [t],
  );
}

/**
 * /wallet-topup — self-service wallet credit through a PSP (Payme/Click).
 *
 * Replaces the former ComingSoon gate. The screen is provider-gated: it
 * asks the BE which providers the club has actually connected
 * (`getPaymentMethods`) and renders one of three branches:
 *   • LOADING  → spinner while that call is in flight
 *   • EMPTY    → info card (no CTA) when the club configured NO provider;
 *                the hard requirement that an unconfigured club never sees
 *                any payment UI
 *   • DATA     → amount chips + custom input + a picker of ONLY the
 *                returned providers, then a sticky Confirm bar
 *
 * Confirm flow: open a top-up order → hand the checkout URL to the in-app
 * browser → on return, poll the order a few times. `paid` → success toast
 * + balance refresh; still pending → calm toast (the PSP webhook credits
 * asynchronously).
 */
export default function WalletTopupScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { refreshMe } = useAuth();
  const providerMeta = useProviderMeta();

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<PaymentMethod | null>(null);
  const [chipAmount, setChipAmount] = useState<number | null>(AMOUNT_CHIPS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Guards a double-tap on Confirm from opening two checkout orders while
  // the first POST is still resolving (state updates are async).
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const list = await walletApi.getPaymentMethods();
      setMethods(list);
      // Auto-select the first provider so the picker never renders
      // unselected (Hard Rule #2 — "auto-select the first valid option").
      setProvider((prev) => prev ?? list[0] ?? null);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // The effective amount: a tapped chip OR a parsed custom value. Custom
  // input wins once the user types into it (we clear the chip on focus).
  const amount = useMemo(() => {
    if (customAmount.trim().length > 0) {
      const parsed = parseInt(customAmount.replace(/\D/g, ''), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return chipAmount ?? 0;
  }, [customAmount, chipAmount]);

  const amountValid = amount >= MIN_AMOUNT;

  const onPickChip = useCallback((value: number) => {
    setChipAmount(value);
    // Clearing the custom field makes the chip authoritative again.
    setCustomAmount('');
  }, []);

  const onChangeCustom = useCallback((raw: string) => {
    // Keep digits only so the parsed amount and the displayed value never
    // diverge (no stray separators / letters reaching the BE).
    const digits = raw.replace(/\D/g, '');
    setCustomAmount(digits);
    // Once the user commits to a custom amount, no chip stays highlighted.
    if (digits.length > 0) setChipAmount(null);
  }, []);

  /**
   * Poll the order until `paid` or the try budget is exhausted. Returns
   * true on a confirmed payment. Failures are swallowed per-try so a
   * transient network blip mid-poll doesn't abort the whole sequence —
   * the next tick retries.
   */
  const pollUntilPaid = useCallback(async (orderId: string): Promise<boolean> => {
    for (let i = 0; i < POLL_MAX_TRIES; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const status = await walletApi.getTopupStatus(orderId);
        if (status.paid) return true;
      } catch {
        // Ignore and retry on the next tick — the webhook may still be
        // settling and the status endpoint can blip under load.
      }
    }
    return false;
  }, []);

  const onConfirm = useCallback(async () => {
    if (submittingRef.current) return;
    if (!provider) return;
    if (!amountValid) {
      toast.error(t.walletTopup.minAmountError);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    let order: TopupOrder;
    try {
      order = await walletApi.createTopupOrder(amount, provider);
    } catch (e) {
      // 422 "Bu to'lov usuli ulanmagan." (provider unavailable) and bad-
      // amount validation both arrive here; getErrorMessage already
      // unwraps the BE `message` / first field error.
      toast.error(getErrorMessage(e));
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      // Opens the PSP checkout. On a device with the Payme/Click app
      // installed the OS hands off to it; otherwise the user pays on the
      // web page. The promise resolves when the browser sheet is closed.
      await WebBrowser.openBrowserAsync(order.checkoutUrl);
    } catch (e) {
      toast.error(getErrorMessage(e));
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    const paid = await pollUntilPaid(order.orderId);
    if (paid) {
      toast.success(t.walletTopup.paidToast);
      // Pull the fresh per-tenant balance so the wallet tab shows the
      // credited amount immediately when the user lands back on it.
      await refreshMe().catch(() => undefined);
    } else {
      // Still pending: the PSP webhook will credit asynchronously. Keep
      // the message calm — this is not an error, just "not yet".
      toast.info(t.walletTopup.pendingToast);
    }
    submittingRef.current = false;
    setSubmitting(false);
  }, [provider, amount, amountValid, pollUntilPaid, refreshMe, toast, t]);

  // ── LOADING ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SimpleHeader title={t.walletTopup.headerTitle} />
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingLabel}>{t.walletTopup.loadingLabel}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── EMPTY (club configured no online top-up) ──────────────────────────
  // Hard requirement: no configured provider → no payment UI at all. Info
  // card only, deliberately WITHOUT an action CTA.
  if (!methods || methods.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <SimpleHeader title={t.walletTopup.headerTitle} />
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <CardIcon size={28} color="#F59E0B" />
            </View>
            <Text style={styles.emptyTitle}>{t.walletTopup.emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{t.walletTopup.emptySubtitle}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── DATA ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.walletTopup.headerTitle} />
      <KeyboardSafeView>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount section — quick-pick chips + a custom-amount input. */}
          <Text style={styles.sectionTitle}>{t.walletTopup.amountSectionTitle}</Text>
          <View style={styles.chipsGrid}>
            {AMOUNT_CHIPS.map((value) => {
              const isActive = customAmount.trim().length === 0 && chipAmount === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => onPickChip(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${formatSum(value)} ${t.common.currencyUnit}`}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {formatSum(value)}
                  </Text>
                  <Text style={[styles.chipUnit, isActive && styles.chipTextActive]}>
                    {t.common.currencyUnit}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={onChangeCustom}
              keyboardType="number-pad"
              placeholder={t.walletTopup.customAmountPlaceholder}
              placeholderTextColor={Colors.textMuted}
              maxLength={9}
              accessibilityLabel={t.walletTopup.customAmountPlaceholder}
            />
            <Text style={styles.customUnit}>{t.common.currencyUnit}</Text>
          </View>
          <Text style={styles.minHint}>{t.walletTopup.minHint}</Text>

          {/* Provider picker — ONLY the providers the BE returned. */}
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            {t.walletTopup.methodSectionTitle}
          </Text>
          {methods.map((m) => {
            const meta = providerMeta[m];
            const isActive = provider === m;
            return (
              <Pressable
                key={m}
                style={[styles.methodRow, isActive && styles.methodRowActive]}
                onPress={() => setProvider(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t.walletTopup.methodA11y.replace('{name}', meta.name)}
              >
                <View style={[styles.methodLogo, { backgroundColor: meta.accent }]}>
                  <Text style={styles.methodLogoText}>{meta.letter}</Text>
                </View>
                <View style={styles.methodBody}>
                  <Text style={styles.methodName}>{meta.name}</Text>
                  <Text style={styles.methodSub} numberOfLines={1}>
                    {meta.sub}
                  </Text>
                </View>
                <View style={[styles.radio, isActive && styles.radioActive]}>
                  {isActive && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sticky confirm bar — lg gradient pill with a leading lock to
            reinforce the secure-payment step. Disabled until an amount
            ≥ minimum and a provider are both set; spinner while the order
            is being created / the browser is open / we're polling. */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onConfirm}
            disabled={!amountValid || !provider || submitting}
            accessibilityRole="button"
            accessibilityLabel={t.walletTopup.confirmBtn}
            accessibilityState={{
              disabled: !amountValid || !provider || submitting,
              busy: submitting,
            }}
            style={[
              confirmBtnStyles.btn,
              (!amountValid || !provider || submitting) && confirmBtnStyles.btnDisabled,
            ]}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={confirmBtnStyles.fill}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <LockIcon size={16} color={Colors.white} />
                  <Text style={confirmBtnStyles.label} numberOfLines={1}>
                    {amountValid
                      ? t.walletTopup.payBtn.replace('{amount}', formatSum(amount))
                      : t.walletTopup.confirmBtn}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },

  // ── Section headings ──────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 24,
  },

  // ── Amount chips ──────────────────────────────────────────────────────
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    // Two-up grid: each chip claims just under half the row width so the
    // four chips wrap into a clean 2×2 block regardless of locale width.
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
    borderColor: Colors.primaryDark,
  },
  chipText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  chipUnit: {
    fontFamily: Fonts.inter.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primaryDark,
  },

  // ── Custom amount input ───────────────────────────────────────────────
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customInput: {
    flex: 1,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 16,
  },
  customUnit: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  minHint: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },

  // ── Provider picker ───────────────────────────────────────────────────
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  methodRowActive: {
    borderColor: Colors.primaryDark,
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  methodLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLogoText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 18,
    color: Colors.white,
  },
  methodBody: {
    flex: 1,
    gap: 3,
  },
  methodName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  methodSub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#3A4250',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primaryDark,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryDark,
  },

  // ── Empty state ───────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
  },
  emptyTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

// Sticky confirm CTA — lg pill, no shadow (Hard Rule #3); the gradient
// fill carries the affordance.
const confirmBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: Colors.white,
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleHeader from '../components/common/SimpleHeader';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import CheckIcon from '../components/icons/CheckIcon';
import PlusIcon from '../components/icons/PlusIcon';
import HomeIcon from '../components/icons/HomeIcon';
import { useAuth } from '../store/AuthProvider';
import * as clubsApi from '../lib/api/services/clubs';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import { useDialog } from '../components/common/AppDialog';
import { useToast } from '../components/common/Toast';

/**
 * Balance formatter matching the Uzbek thousand-separator style
 * (space-grouped, no decimal places for whole-sum amounts). The
 * default `toLocaleString()` returns en-US dot-grouped strings on
 * RN, which reads as a decimal value to UZ/RU users.
 */
function formatBalance(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.trunc(value).toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function ClubsSwitchScreen() {
  const t = useT();
  const dialog = useDialog();
  const toast = useToast();
  const { clubs, currentTenantId, switchClub, refreshMe } = useAuth();
  // Per-tenant action lock. Replaces the single `switchingId` field
  // — now a Set so concurrent switch + leave on different rows are
  // both gated without stepping on each other. Same idiom we use
  // in friends-list + team-chat.
  const [actingIds, setActingIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const lockRow = (id: number) =>
    setActingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const unlockRow = (id: number) =>
    setActingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const onSwitch = async (tenantId: number) => {
    if (actingIds.has(tenantId)) return;
    if (tenantId === currentTenantId) {
      router.back();
      return;
    }
    lockRow(tenantId);
    try {
      await switchClub(tenantId);
      // Switching is a single-step success — a Toast feels lighter
      // than a full success dialog and matches how other "OK done"
      // confirmations work elsewhere (login/register).
      toast.success(t.clubsSwitch.activatedToast);
      router.replace('/(tabs)');
    } catch (e) {
      await dialog.alert({
        title: t.common.error,
        message: getErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      unlockRow(tenantId);
    }
  };

  const onLeave = async (tenantId: number, tenantName: string) => {
    if (actingIds.has(tenantId)) return;
    // Destructive confirm — leaving forfeits balance and cascades
    // booking deletes. User should explicitly opt in.
    const ok = await dialog.confirm({
      title: t.clubsSwitch.leaveConfirmTitle,
      message: t.clubsSwitch.leaveConfirmMessage.replace('{name}', tenantName),
      confirmLabel: t.clubsSwitch.leaveBtn,
      cancelLabel: t.clubsSwitch.cancelBtn,
      destructive: true,
    });
    if (!ok) return;

    lockRow(tenantId);
    try {
      await clubsApi.leaveClub(tenantId);
      toast.info(t.clubsSwitch.leftToast.replace('{name}', tenantName));

      // Stale-currentTenantId guard — if the user just left their
      // ACTIVE club, the AuthProvider's currentTenantId now points
      // at a deleted tenant. Every subsequent client.auth call
      // (bookings, wallet, promotions, etc.) would 401 because the
      // BE no longer has a Client row for this user × tenant pair.
      //
      // Recovery: switch into one of the remaining clubs so the
      // user lands in a valid session. If no clubs remain, leave
      // currentTenantId null (AuthProvider treats null as "browse
      // mode" and gates accordingly).
      //
      // Pre-fix this wasn't handled — leaving the current club
      // left the user in a half-broken state until they manually
      // tapped another club row. Common support ticket.
      if (tenantId === currentTenantId) {
        const remaining = clubs.filter((c) => c.tenant_id !== tenantId);
        if (remaining.length > 0) {
          try {
            await switchClub(remaining[0].tenant_id);
          } catch {
            // Auto-switch failure isn't fatal — the next refreshMe
            // will reconcile, and the user can manually pick a club
            // from the list.
          }
        }
      }

      // Refresh AuthProvider's membership list so the leaving club
      // drops out of the local clubs array. Race-safe: if refresh
      // returns the old list (BE caching), the next focus-driven
      // refetch picks it up — but in practice the DELETE is
      // committed-before-response so the immediate /auth/me sees
      // the new state.
      try {
        await refreshMe();
      } catch {
        // refreshMe failure is non-blocking; the UI will catch up
        // when the user navigates back.
      }
    } catch (e) {
      await dialog.alert({
        title: t.common.error,
        message: getErrorMessage(e),
        variant: 'destructive',
      });
    } finally {
      unlockRow(tenantId);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMe();
    } catch {
      // Quiet — toast on permanent failures would be noisy; the
      // refresh control already provides UI feedback (the spinner
      // dismisses regardless of outcome).
    } finally {
      setRefreshing(false);
    }
  }, [refreshMe]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.clubsSwitch.headerTitle} />

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
        <Text style={styles.subtitle}>{t.clubsSwitch.sectionMine}</Text>

        {clubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <HomeIcon size={32} color="#8B95A8" />
            </View>
            <Text style={styles.emptyTitle}>{t.profile.menu.myClubs}</Text>
            <Text style={styles.emptyText}>{t.clubJoin.subtitle}</Text>
          </View>
        ) : (
          clubs.map((c) => {
            const isCurrent = c.tenant_id === currentTenantId;
            const isActing = actingIds.has(c.tenant_id);
            return (
              <View
                key={c.tenant_id}
                style={[styles.clubCard, isCurrent && styles.clubCardActive]}
              >
                {/* Main row — tap switches into the club. Wrapped
                    in a TouchableOpacity so the whole card area
                    (icon + info) is the switch tap target; the
                    leave button to the right is a SEPARATE
                    pressable so its tap doesn't trigger a switch. */}
                <TouchableOpacity
                  style={styles.clubRowMain}
                  activeOpacity={0.85}
                  onPress={() => onSwitch(c.tenant_id)}
                  disabled={isActing}
                  accessibilityRole="button"
                  accessibilityLabel={c.tenant_name || `#${c.tenant_id}`}
                  accessibilityState={{ selected: isCurrent }}
                >
                  <View style={styles.clubIcon}>
                    <LocationPinIcon size={20} color="#00CFFF" />
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>
                      {c.tenant_name || `#${c.tenant_id}`}
                    </Text>
                    {c.balance != null && (
                      <Text style={styles.clubMeta}>
                        {formatBalance(Number(c.balance))} {t.common.currencyUnit}
                      </Text>
                    )}
                  </View>
                  {isActing ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : isCurrent ? (
                    <View style={styles.activeBadge}>
                      <CheckIcon size={14} color="#22C55E" />
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* Leave button — separate pressable so its tap
                    doesn't bubble to the switch action. hitSlop
                    widens the touch target without bloating the
                    icon. Hidden while a row action is in flight
                    so the user can't trigger leave during switch. */}
                {!isActing && (
                  <TouchableOpacity
                    style={styles.leaveBtn}
                    onPress={() =>
                      onLeave(c.tenant_id, c.tenant_name || `#${c.tenant_id}`)
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t.clubsSwitch.leaveBtn}
                  >
                    <LogOut size={16} color="#EF4444" strokeWidth={1.8} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <View style={styles.addBtnWrap}>
          {/* "Klub qo'shish" CTA — 52pt pill with leading plus icon.
              Inline so the icon+label gap (10pt) can be tuned to the
              specific label length without leaking into other primary
              buttons. */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/club-join')}
            accessibilityRole="button"
            accessibilityLabel={t.clubsSwitch.addBtn}
            style={addBtnStyles.btn}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={addBtnStyles.fill}
            >
              <PlusIcon size={18} color="#FFFFFF" />
              <Text style={addBtnStyles.label}>{t.clubsSwitch.addBtn}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 149, 168, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12.5,
    color: '#8B95A8',
    textAlign: 'center',
  },
  // Card now hosts main row + leave button as siblings (was
  // single Touchable). flexDirection row keeps them side-by-side.
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  clubCardActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  clubRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  clubIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubInfo: { flex: 1, gap: 3 },
  clubName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  clubMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Leave button — sits at the right edge of the card. Small
  // red tile so destructive nature is obvious without screaming.
  // Hidden during in-flight actions to prevent accidental tap.
  leaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  addBtnWrap: { marginTop: 14 },
});

const addBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

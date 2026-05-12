import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import LocationPinIcon from '../components/icons/LocationPinIcon';
import CheckIcon from '../components/icons/CheckIcon';
import Button from '../components/common/Button';
import PlusIcon from '../components/icons/PlusIcon';
import HomeIcon from '../components/icons/HomeIcon';
import { useAuth } from '../store/AuthProvider';
import { getErrorMessage } from '../lib/api/client';
import { useT } from '../lib/i18n/LocaleProvider';
import { useDialog } from '../components/common/AppDialog';
import { useToast } from '../components/common/Toast';

export default function ClubsSwitchScreen() {
  const t = useT();
  const dialog = useDialog();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { clubs, currentTenantId, switchClub } = useAuth();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const onSwitch = async (tenantId: number) => {
    if (tenantId === currentTenantId) {
      router.back();
      return;
    }
    setSwitchingId(tenantId);
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
      setSwitchingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.clubsSwitch.headerTitle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            const isSwitching = switchingId === c.tenant_id;
            return (
              <TouchableOpacity
                key={c.tenant_id}
                style={[styles.clubCard, isCurrent && styles.clubCardActive]}
                activeOpacity={0.85}
                onPress={() => onSwitch(c.tenant_id)}
                disabled={isSwitching}
              >
                <View style={styles.clubIcon}>
                  <LocationPinIcon size={20} color="#00CFFF" />
                </View>
                <View style={styles.clubInfo}>
                  <Text style={styles.clubName}>{c.tenant_name || `#${c.tenant_id}`}</Text>
                  {c.balance != null && (
                    <Text style={styles.clubMeta}>
                      {Number(c.balance).toLocaleString()} {t.common.currencyUnit}
                    </Text>
                  )}
                </View>
                {isSwitching ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : isCurrent ? (
                  <View style={styles.activeBadge}>
                    <CheckIcon size={14} color="#22C55E" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.addBtnWrap}>
          <Button
            label={t.clubsSwitch.addBtn}
            variant="primary"
            size="lg"
            fullWidth
            icon={<PlusIcon size={18} color="#FFFFFF" />}
            onPress={() => router.push('/club-join')}
          />
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
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  clubCardActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
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
  addBtnWrap: { marginTop: 14 },
});

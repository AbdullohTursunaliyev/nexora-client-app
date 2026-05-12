import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import CheckIcon from '../components/icons/CheckIcon';
import StarIcon from '../components/icons/StarIcon';
import Button from '../components/common/Button';
import { useT } from '../lib/i18n/LocaleProvider';
import { useSelectedZone } from '../lib/state/useSelectedZone';

const ACCENT = '#00CFFF';

export default function ZoneSwitchScreen() {
  const t = useT();
  const [time, setTime] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { select: selectZone } = useSelectedZone();

  const TIME_OPTIONS = useMemo(
    () => [
      { id: '30m', title: t.zoneSwitch.timeMin30, price: 30000 },
      { id: '1h', title: t.zoneSwitch.timeHour1, price: 50000 },
      { id: '2h', title: t.zoneSwitch.timeHour2, price: 90000 },
      { id: '3h', title: t.zoneSwitch.timeHour3, price: 120000 },
    ],
    [t]
  );

  const ZONE_OPTIONS = useMemo(
    () => [
      { id: 'vip', title: t.zoneSwitch.zoneVip, subtitle: t.zoneSwitch.zoneVipSub, price: 30000, color: '#7C3AED' },
      { id: 'premium', title: t.zoneSwitch.zonePremium, subtitle: t.zoneSwitch.zonePremiumSub, price: 60000, color: '#FF34E0' },
    ],
    [t]
  );

  const totalPrice = useMemo(() => {
    const timePrice = time ? TIME_OPTIONS.find((o) => o.id === time)?.price ?? 0 : 0;
    const zonePrice = zone ? ZONE_OPTIONS.find((o) => o.id === zone)?.price ?? 0 : 0;
    return timePrice + zonePrice;
  }, [time, zone, TIME_OPTIONS, ZONE_OPTIONS]);

  const formatPrice = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.zoneSwitch.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>{t.zoneSwitch.currentLabel}</Text>
          <View style={styles.currentRow}>
            <Text style={styles.currentName}>PS zona</Text>
            <View style={styles.standardBadge}>
              <Text style={styles.standardText}>{t.zoneSwitch.standardBadge}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t.zoneSwitch.extraTimeTitle}</Text>

        {TIME_OPTIONS.map((opt) => {
          const isActive = time === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setTime(opt.id)}
              style={[styles.optionRow, isActive && styles.optionRowActive]}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionPrice}>{formatPrice(opt.price)} {t.common.currencyUnit}</Text>
              </View>
              <View style={[styles.radio, isActive && styles.radioActive]}>
                {isActive && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>{t.zoneSwitch.upgradeTitle}</Text>

        {ZONE_OPTIONS.map((opt) => {
          const isActive = zone === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setZone((curr) => (curr === opt.id ? null : opt.id))}
              style={[styles.zoneOption, isActive && styles.zoneOptionActive]}
            >
              <View style={[styles.zoneIcon, { backgroundColor: opt.color }]}>
                <StarIcon size={16} color={Colors.white} filled />
              </View>
              <View style={styles.zoneContent}>
                <Text style={styles.zoneTitle}>{opt.title}</Text>
                <Text style={styles.zoneSubtitle}>{opt.subtitle}</Text>
              </View>
              <View style={styles.zonePriceWrap}>
                {isActive && <CheckIcon size={12} color="#22C55E" />}
                <Text style={[styles.zonePrice, isActive && { color: '#22C55E' }]}>
                  +{formatPrice(opt.price)} {t.common.currencyUnit}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          label={t.zoneSwitch.continueBtn.replace('{amount}', formatPrice(totalPrice))}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!time || !zone}
          onPress={() => {
            // Persist the chosen zone via the same `useSelectedZone`
            // hook the seat-select screen reads from — without this the
            // zone param is silently dropped (seat-select reads from
            // AsyncStorage, not from router params) and the user
            // upgrades to "VIP" only to see the previous zone's seats.
            if (zone) selectZone(zone);
            router.push({
              pathname: '/seat-select',
              params: { zone: zone ?? '', time: time ?? '' },
            });
          }}
        />
        <Text style={styles.footer}>{t.zoneSwitch.footer}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  currentCard: {
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 14,
  },
  currentLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  currentName: {
    fontFamily: Fonts.inter.bold,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  standardBadge: {
    backgroundColor: '#1F2533',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  standardText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionRowActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  optionPrice: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 2,
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
    borderColor: ACCENT,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  zoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  zoneOptionActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
  },
  zoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneContent: {
    flex: 1,
  },
  zoneTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  zoneSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 1,
  },
  zonePriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  zonePrice: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: Colors.text,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  footer: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#6B7280',
    textAlign: 'center',
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import CheckIcon from '../components/icons/CheckIcon';
import { useLocale } from '../lib/i18n/LocaleProvider';
import { Locale, LOCALE_NATIVE_LABEL } from '../lib/i18n/translations';

const OPTIONS: { code: Locale; label: string; sub: string }[] = [
  { code: 'uz', label: LOCALE_NATIVE_LABEL.uz, sub: 'Uzbek' },
  { code: 'ru', label: LOCALE_NATIVE_LABEL.ru, sub: 'Russian' },
  { code: 'en', label: LOCALE_NATIVE_LABEL.en, sub: 'English' },
];

export default function LanguageSelectScreen() {
  const { locale, setLocale, t } = useLocale();

  const onSelect = async (code: Locale) => {
    await setLocale(code);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SimpleHeader title={t.language.title} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t.language.subtitle}</Text>

        <View style={styles.list}>
          {OPTIONS.map(({ code, label, sub }) => {
            const active = locale === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.row, active && styles.rowActive]}
                activeOpacity={0.7}
                onPress={() => onSelect(code)}
              >
                <View style={styles.textBlock}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.sub}>{sub}</Text>
                </View>
                {active ? (
                  <View style={styles.checkBg}>
                    <CheckIcon size={14} color={Colors.white} />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    paddingBottom: 24,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    marginBottom: 14,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActive: {
    borderColor: 'rgba(0, 207, 255, 0.4)',
    backgroundColor: 'rgba(0, 207, 255, 0.08)',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  sub: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  checkBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3A4250',
  },
});

import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';
import { useT } from '../../lib/i18n/LocaleProvider';

export interface AdvancedFilters {
  minRating: number | null;
  maxDistanceKm: number | null;
}

const RATING_OPTIONS: { label: string; value: number }[] = [
  { label: '4.0+', value: 4.0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
];

const DISTANCE_OPTIONS: { label: string; value: number }[] = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  value: AdvancedFilters;
  onApply: (next: AdvancedFilters) => void;
}

export default function FilterSheet({ visible, onClose, value, onApply }: Props) {
  const t = useT();
  const [draft, setDraft] = useState<AdvancedFilters>(value);

  // Reset is a one-tap action: clear the draft, commit it via
  // onApply, AND close the sheet. Pre-fix this only zeroed the local
  // draft, leaving the user to then tap "Apply" — confusing because
  // the chip rows visibly emptied and looked already applied, yet
  // the parent filters didn't actually update until Apply ran. Now
  // "Reset" behaves as a single decisive action like every other
  // reset control in the app.
  const reset = () => {
    const cleared: AdvancedFilters = { minRating: null, maxDistanceKm: null };
    setDraft(cleared);
    onApply(cleared);
    onClose();
  };

  const apply = () => {
    onApply(draft);
    onClose();
  };

  // Pre-fix (RESP-H3) the sheet hardcoded `paddingBottom: 22` which on
  // iPhones with home indicator (34pt) and Android gesture nav left the
  // apply/reset row crammed under the system pill. Using the live
  // safe-area inset keeps the buttons reachable on every device.
  const insets = useSafeAreaInsets();
  const sheetStyle = [styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 16) }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyle} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t.discover.filterSheetTitle}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>{t.discover.filterRating}</Text>
            <View style={styles.optionsRow}>
              {RATING_OPTIONS.map((opt) => {
                const active = draft.minRating === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, active && styles.optionActive]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        minRating: active ? null : opt.value,
                      }))
                    }
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      ⭐ {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.section, { marginTop: 18 }]}>{t.discover.filterDistance}</Text>
            <View style={styles.optionsRow}>
              {DISTANCE_OPTIONS.map((opt) => {
                const active = draft.maxDistanceKm === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, active && styles.optionActive]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        maxDistanceKm: active ? null : opt.value,
                      }))
                    }
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={reset}>
              <Text style={styles.resetText}>{t.discover.filterReset}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={apply}>
              <LinearGradient
                colors={['#3B5BF5', '#8B3DF5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.applyGradient}
              >
                <Text style={styles.applyText}>{t.discover.filterApply}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingBottom comes from useSafeAreaInsets in the component body.
    maxHeight: '80%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 14,
  },
  section: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#8B95A8',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#1A1F2B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderColor: '#00CFFF',
  },
  optionText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.text,
  },
  optionTextActive: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.semiBold,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  resetBtn: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A1F2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: '#8B95A8',
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.white,
  },
});

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  /**
   * Optional label shown alongside the spinner while `loading` is true.
   * If omitted the button just shows a spinner — fine for snappy
   * actions, but for slow round-trips (login, payment, file upload)
   * passing a loadingLabel like "Tekshirilmoqda..." gives the user a
   * sense that the work is in progress instead of a frozen button.
   */
  loadingLabel?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 46, lg: 52 };
const SIZE_FONT: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 15 };
// Full pill shape (radius >= height/2) — gives a clearly rounded look across all sizes
const SIZE_RADIUS: Record<ButtonSize, number> = { sm: 999, md: 999, lg: 999 };
// Generous horizontal padding so short-text buttons (sm/md) don't visually clip
// against the pill's curvature.
const SIZE_PADDING: Record<ButtonSize, number> = { sm: 24, md: 28, lg: 32 };
// Minimum width prevents 1–2 word buttons (Qabul / Rad / Olish) from getting cramped
const SIZE_MIN_WIDTH: Record<ButtonSize, number> = { sm: 80, md: 100, lg: 120 };

export default function Button({
  label,
  loadingLabel,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  iconRight,
  fullWidth,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const height = SIZE_HEIGHT[size];
  const radius = SIZE_RADIUS[size];
  const fontSize = SIZE_FONT[size];
  const paddingH = SIZE_PADDING[size];
  const minWidth = SIZE_MIN_WIDTH[size];

  const containerStyle: StyleProp<ViewStyle> = [
    {
      height,
      borderRadius: radius,
      paddingHorizontal: variant === 'ghost' ? 0 : paddingH,
    },
    // Only enforce a minimum width on inline (non-fullWidth) buttons so short
    // labels like "Qabul"/"Rad" don't get crushed by the pill curvature.
    !fullWidth && variant !== 'ghost' && { minWidth },
    fullWidth && { alignSelf: 'stretch' },
    isDisabled && styles.disabled,
    style,
  ];

  const spinnerColor = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#0B0F16';
  const inner = (
    <View style={styles.row}>
      {icon}
      {loading ? (
        <>
          <ActivityIndicator color={spinnerColor} size="small" />
          {loadingLabel && (
            <Text
              style={[styles.label, getLabelStyle(variant), { fontSize, marginLeft: 8 }]}
              numberOfLines={1}
            >
              {loadingLabel}
            </Text>
          )}
        </>
      ) : (
        <Text style={[styles.label, getLabelStyle(variant), { fontSize }]} numberOfLines={1}>
          {label}
        </Text>
      )}
      {iconRight}
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.gradientWrap, containerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      >
        <LinearGradient
          colors={['#3B5BF5', '#8B3DF5']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradientFill, { borderRadius: radius }]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.gradientWrap, containerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      >
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradientFill, { borderRadius: radius }]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.solid, styles.secondary, containerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.solid, styles.outline, containerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.solid, containerStyle]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
    >
      {inner}
    </TouchableOpacity>
  );
}

function getLabelStyle(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
    case 'danger':
      return { color: Colors.white, fontFamily: Fonts.inter.semiBold };
    case 'secondary':
      return { color: '#0B0F16', fontFamily: Fonts.inter.semiBold };
    case 'outline':
      return { color: '#00CFFF', fontFamily: Fonts.inter.semiBold };
    case 'ghost':
    default:
      return { color: '#00CFFF', fontFamily: Fonts.inter.medium };
  }
}

const styles = StyleSheet.create({
  gradientWrap: {
    // No shadow / no elevation. Per the design direction: every
    // button should sit flat against the background. The gradient
    // fill is what conveys "primary action", not depth — and on a
    // dark UI even a subtle neutral shadow read as a glow / halo
    // halo we don't want.
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#00CFFF',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 207, 255, 0.45)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

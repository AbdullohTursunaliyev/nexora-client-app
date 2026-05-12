import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ComponentType } from 'react';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Fonts';

interface Props {
  Icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  price: string;
  oldPrice?: string;
  discount?: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function PackageCard({
  Icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  price,
  oldPrice,
  discount,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${title}, ${subtitle}, ${price}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBgColor }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.priceWrap}>
        {discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}</Text>
          </View>
        )}
        {oldPrice && <Text style={styles.oldPrice}>{oldPrice}</Text>}
        <Text style={styles.price}>{price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14.5,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
  },
  priceWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  discountBadge: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  discountText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  oldPrice: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: Fonts.inter.bold,
    fontSize: 14,
    color: Colors.text,
  },
});

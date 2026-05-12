import { ShoppingBag } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function ShoppingBagIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <ShoppingBag size={size} color={color} strokeWidth={1.8} />;
}

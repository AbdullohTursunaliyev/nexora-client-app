import { Coins } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CoinIcon({ size = 14, color = '#F59E0B' }: Props) {
  return <Coins size={size} color={color} strokeWidth={1.8} />;
}

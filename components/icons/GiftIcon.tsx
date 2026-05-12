import { Gift } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function GiftIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Gift size={size} color={color} strokeWidth={1.8} />;
}

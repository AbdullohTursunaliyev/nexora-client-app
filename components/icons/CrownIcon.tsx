import { Crown } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CrownIcon({ size = 18, color = '#F59E0B' }: Props) {
  return <Crown size={size} color={color} strokeWidth={1.8} />;
}

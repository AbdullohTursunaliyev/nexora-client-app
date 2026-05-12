import { Flame } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function StreakFireIcon({ size = 22, color = '#F59E0B' }: Props) {
  return <Flame size={size} color={color} fill={color} strokeWidth={1.8} />;
}

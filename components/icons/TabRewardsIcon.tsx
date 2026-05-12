import { Trophy } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function TabRewardsIcon({ size = 24, color = '#8B95A8' }: Props) {
  return <Trophy size={size} color={color} strokeWidth={1.8} />;
}

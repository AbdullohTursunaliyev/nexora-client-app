import { Trophy } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function TrophyIcon({ size = 18, color = '#F59E0B' }: Props) {
  return <Trophy size={size} color={color} strokeWidth={1.8} />;
}

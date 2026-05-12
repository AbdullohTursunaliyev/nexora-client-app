import { Medal } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function MedalIcon({ size = 18, color = '#F59E0B' }: Props) {
  return <Medal size={size} color={color} strokeWidth={1.8} />;
}

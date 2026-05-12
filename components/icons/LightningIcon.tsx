import { Zap } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function LightningIcon({ size = 18, color = '#F59E0B' }: Props) {
  return <Zap size={size} color={color} strokeWidth={1.8} />;
}

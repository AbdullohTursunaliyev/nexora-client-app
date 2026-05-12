import { Shield } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function ShieldIcon({ size = 12, color = '#22C55E' }: Props) {
  return <Shield size={size} color={color} strokeWidth={1.8} />;
}

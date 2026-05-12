import { Lock } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function LockIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Lock size={size} color={color} strokeWidth={1.8} />;
}

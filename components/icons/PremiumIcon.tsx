import { Sparkles } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PremiumIcon({ size = 22, color = '#00E5FF' }: Props) {
  return <Sparkles size={size} color={color} fill={color} strokeWidth={1.8} />;
}

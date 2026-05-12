import { Share2 } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function ShareIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Share2 size={size} color={color} strokeWidth={1.8} />;
}

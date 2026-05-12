import { Square } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function StopIcon({ size = 16, color = '#EF4444' }: Props) {
  return <Square size={size} color={color} fill={color} strokeWidth={0} />;
}

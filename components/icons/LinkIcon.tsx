import { Link2 } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function LinkIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <Link2 size={size} color={color} strokeWidth={1.8} />;
}

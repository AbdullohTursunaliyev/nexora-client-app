import { Headphones } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function HeadphonesIcon({ size = 22, color = '#7C3AED' }: Props) {
  return <Headphones size={size} color={color} strokeWidth={1.8} />;
}

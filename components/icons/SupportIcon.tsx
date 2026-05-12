import { LifeBuoy } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function SupportIcon({ size = 22, color = '#00CFFF' }: Props) {
  return <LifeBuoy size={size} color={color} strokeWidth={1.8} />;
}

import { ArrowRightLeft } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function SwitchIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <ArrowRightLeft size={size} color={color} strokeWidth={1.8} />;
}

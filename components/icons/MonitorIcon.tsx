import { Monitor } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function MonitorIcon({ size = 18, color = '#00CFFF' }: Props) {
  return <Monitor size={size} color={color} strokeWidth={1.8} />;
}

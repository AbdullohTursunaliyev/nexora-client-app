import { Wifi } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function WifiIcon({ size = 22, color = '#22C55E' }: Props) {
  return <Wifi size={size} color={color} strokeWidth={1.8} />;
}

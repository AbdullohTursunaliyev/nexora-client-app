import { MapPin } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function LocationPinIcon({ size = 16, color = '#00CFFF' }: Props) {
  return <MapPin size={size} color={color} strokeWidth={1.8} />;
}

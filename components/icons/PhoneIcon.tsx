import { Phone } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PhoneIcon({ size = 18, color = '#9CA3AF' }: Props) {
  return <Phone size={size} color={color} strokeWidth={1.8} />;
}

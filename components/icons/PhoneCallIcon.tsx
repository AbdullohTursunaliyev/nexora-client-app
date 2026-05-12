import { PhoneCall } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PhoneCallIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <PhoneCall size={size} color={color} strokeWidth={1.8} />;
}

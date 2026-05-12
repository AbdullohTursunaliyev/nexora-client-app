import { QrCode } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function QrIcon({ size = 18, color = '#9CA3AF' }: Props) {
  return <QrCode size={size} color={color} strokeWidth={1.8} />;
}

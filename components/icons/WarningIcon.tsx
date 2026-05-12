import { AlertTriangle } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function WarningIcon({ size = 18, color = '#F59E0B' }: Props) {
  return <AlertTriangle size={size} color={color} strokeWidth={1.8} />;
}

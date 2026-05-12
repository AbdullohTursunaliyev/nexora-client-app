import { Calendar } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CalendarIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Calendar size={size} color={color} strokeWidth={1.8} />;
}

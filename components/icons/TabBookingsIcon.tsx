import { CalendarDays } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function TabBookingsIcon({ size = 22, color = '#8B95A8' }: Props) {
  return <CalendarDays size={size} color={color} strokeWidth={1.8} />;
}

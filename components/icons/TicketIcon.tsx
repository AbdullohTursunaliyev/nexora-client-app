import { Ticket } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function TicketIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Ticket size={size} color={color} strokeWidth={1.8} />;
}

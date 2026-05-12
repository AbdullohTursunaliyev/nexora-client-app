import { CreditCard } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CardIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <CreditCard size={size} color={color} strokeWidth={1.8} />;
}

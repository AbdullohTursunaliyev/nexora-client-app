import { Banknote } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CashIcon({ size = 22, color = '#FFFFFF' }: Props) {
  return <Banknote size={size} color={color} strokeWidth={1.8} />;
}

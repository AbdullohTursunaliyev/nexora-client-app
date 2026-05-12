import { PlusCircle } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PlusCircleIcon({ size = 22, color = '#00CFFF' }: Props) {
  return <PlusCircle size={size} color={color} strokeWidth={1.8} />;
}

import { SlidersHorizontal } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function FilterIcon({ size = 20, color = '#FFFFFF' }: Props) {
  return <SlidersHorizontal size={size} color={color} strokeWidth={1.8} />;
}

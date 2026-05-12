import { Plus } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PlusIcon({ size = 22, color = '#FFFFFF' }: Props) {
  return <Plus size={size} color={color} strokeWidth={2.4} />;
}

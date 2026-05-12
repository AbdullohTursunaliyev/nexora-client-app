import { Users } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function UsersIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Users size={size} color={color} strokeWidth={1.8} />;
}

import { UserCog } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function StaffIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <UserCog size={size} color={color} strokeWidth={1.8} />;
}

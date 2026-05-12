import { Bell } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function BellIcon({ size = 22, color = '#FFFFFF' }: Props) {
  return <Bell size={size} color={color} strokeWidth={1.8} />;
}

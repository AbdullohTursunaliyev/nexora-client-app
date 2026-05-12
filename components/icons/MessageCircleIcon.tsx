import { MessageCircle } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function MessageCircleIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <MessageCircle size={size} color={color} strokeWidth={1.8} />;
}

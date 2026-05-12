import { Send } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function SendIcon({ size = 20, color = '#FFFFFF' }: Props) {
  return <Send size={size} color={color} strokeWidth={1.8} />;
}

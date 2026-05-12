import { Mic } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function MicIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Mic size={size} color={color} strokeWidth={1.8} />;
}

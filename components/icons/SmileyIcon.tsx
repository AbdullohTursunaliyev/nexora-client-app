import { Smile } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function SmileyIcon({ size = 20, color = '#8B95A8' }: Props) {
  return <Smile size={size} color={color} strokeWidth={1.8} />;
}

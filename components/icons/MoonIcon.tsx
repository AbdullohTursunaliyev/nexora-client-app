import { Moon } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function MoonIcon({ size = 22, color = '#3B82F6' }: Props) {
  return <Moon size={size} color={color} strokeWidth={1.8} />;
}

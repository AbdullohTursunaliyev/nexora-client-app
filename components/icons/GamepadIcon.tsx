import { Gamepad2 } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function GamepadIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Gamepad2 size={size} color={color} strokeWidth={1.8} />;
}

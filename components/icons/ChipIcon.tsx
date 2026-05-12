import { Cpu } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function ChipIcon({ size = 22, color = '#00E5FF' }: Props) {
  return <Cpu size={size} color={color} strokeWidth={1.8} />;
}

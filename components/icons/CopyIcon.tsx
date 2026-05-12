import { Copy } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function CopyIcon({ size = 12, color = '#8B95A8' }: Props) {
  return <Copy size={size} color={color} strokeWidth={1.8} />;
}

import { BarChart3 } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function ChartIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <BarChart3 size={size} color={color} strokeWidth={1.8} />;
}

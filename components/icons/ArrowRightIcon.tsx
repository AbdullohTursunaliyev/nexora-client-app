import { ArrowRight } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function ArrowRightIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <ArrowRight size={size} color={color} strokeWidth={2} />;
}

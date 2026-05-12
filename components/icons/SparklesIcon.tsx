import { Sparkles } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function SparklesIcon({ size = 16, color = '#00CFFF' }: Props) {
  return <Sparkles size={size} color={color} strokeWidth={1.8} />;
}

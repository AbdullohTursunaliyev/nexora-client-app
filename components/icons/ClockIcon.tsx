import { Clock } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function ClockIcon({ size = 12, color = '#8B95A8' }: Props) {
  return <Clock size={size} color={color} strokeWidth={1.8} />;
}

import { Hourglass } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function HourglassIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <Hourglass size={size} color={color} strokeWidth={1.8} />;
}

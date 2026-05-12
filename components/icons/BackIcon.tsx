import { ChevronLeft } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function BackIcon({ size = 22, color = '#FFFFFF' }: Props) {
  return <ChevronLeft size={size + 2} color={color} strokeWidth={2} />;
}

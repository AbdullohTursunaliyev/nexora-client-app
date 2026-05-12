import { ChevronRight } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function ChevronRightIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <ChevronRight size={size} color={color} strokeWidth={2} />;
}

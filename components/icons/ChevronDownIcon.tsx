import { ChevronDown } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function ChevronDownIcon({ size = 16, color = '#8B95A8' }: Props) {
  return <ChevronDown size={size} color={color} strokeWidth={2} />;
}

import { Check } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function CheckIcon({ size = 16, color = '#22C55E' }: Props) {
  return <Check size={size} color={color} strokeWidth={2.4} />;
}

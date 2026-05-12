import { PartyPopper } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function PartyIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <PartyPopper size={size} color={color} strokeWidth={1.8} />;
}

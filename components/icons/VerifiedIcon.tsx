import { BadgeCheck } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function VerifiedIcon({ size = 16, color = '#00CFFF' }: Props) {
  return <BadgeCheck size={size} color={color} fill={color} stroke="#0B0F16" strokeWidth={2.2} />;
}

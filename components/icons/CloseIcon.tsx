import { X } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function CloseIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <X size={size} color={color} strokeWidth={2} />;
}

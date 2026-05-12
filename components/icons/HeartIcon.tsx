import { Heart } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default function HeartIcon({ size = 22, color = '#EF4444', filled = false }: Props) {
  return (
    <Heart
      size={size}
      color={color}
      fill={filled ? color : 'none'}
      strokeWidth={1.8}
    />
  );
}

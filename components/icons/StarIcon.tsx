import { Star } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default function StarIcon({ size = 14, color = '#F59E0B', filled = true }: Props) {
  return (
    <Star
      size={size}
      color={color}
      fill={filled ? color : 'none'}
      strokeWidth={filled ? 0 : 1.8}
    />
  );
}

import { ThumbsUp } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function ThumbsUpIcon({ size = 12, color = '#FFFFFF' }: Props) {
  return <ThumbsUp size={size} color={color} fill={color} strokeWidth={1.5} />;
}

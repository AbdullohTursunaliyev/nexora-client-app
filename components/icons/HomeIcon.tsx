import { Home } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function HomeIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <Home size={size} color={color} strokeWidth={1.8} />;
}

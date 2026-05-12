import { RefreshCw } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function RefreshIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <RefreshCw size={size} color={color} strokeWidth={2} />;
}

import { Brain } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function BrainIcon({ size = 22, color = '#00CFFF' }: Props) {
  return <Brain size={size} color={color} strokeWidth={1.7} />;
}

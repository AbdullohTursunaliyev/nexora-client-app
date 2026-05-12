import { Bot } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function RobotIcon({ size = 22, color = '#00CFFF' }: Props) {
  return <Bot size={size} color={color} strokeWidth={1.7} />;
}

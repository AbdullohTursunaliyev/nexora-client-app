import { Settings } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function SettingsIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <Settings size={size} color={color} strokeWidth={1.8} />;
}

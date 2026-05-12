import { Mail } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function MailIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <Mail size={size} color={color} strokeWidth={1.8} />;
}

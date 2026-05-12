import { Navigation } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function NavigationIcon({ size = 18, color = '#FFFFFF' }: Props) {
  return <Navigation size={size} color={color} strokeWidth={1.8} fill={color} />;
}

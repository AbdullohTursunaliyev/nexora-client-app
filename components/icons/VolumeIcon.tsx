import { Volume2 } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function VolumeIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <Volume2 size={size} color={color} strokeWidth={1.8} />;
}

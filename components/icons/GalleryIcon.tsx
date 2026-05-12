import { Image as ImageIcon } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function GalleryIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <ImageIcon size={size} color={color} strokeWidth={1.8} />;
}

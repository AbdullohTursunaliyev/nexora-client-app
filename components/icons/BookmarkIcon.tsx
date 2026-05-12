import { Bookmark } from 'lucide-react-native';
interface Props { size?: number; color?: string; filled?: boolean; }
export default function BookmarkIcon({ size = 16, color = '#8B95A8', filled }: Props) {
  return <Bookmark size={size} color={color} fill={filled ? color : 'none'} strokeWidth={1.8} />;
}

import { Paperclip } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function AttachmentIcon({ size = 18, color = '#8B95A8' }: Props) {
  return <Paperclip size={size} color={color} strokeWidth={1.8} />;
}

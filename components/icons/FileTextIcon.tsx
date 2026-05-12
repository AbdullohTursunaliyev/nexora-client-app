import { FileText } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function FileTextIcon({ size = 16, color = '#FFFFFF' }: Props) {
  return <FileText size={size} color={color} strokeWidth={1.8} />;
}

import { Package } from 'lucide-react-native';
interface Props { size?: number; color?: string; }
export default function PackageIcon({ size = 22, color = '#00CFFF' }: Props) {
  return <Package size={size} color={color} strokeWidth={1.8} />;
}

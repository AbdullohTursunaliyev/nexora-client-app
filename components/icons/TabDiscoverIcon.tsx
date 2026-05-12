import { Search } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  /** See TabHomeIcon — kept on API but unused; we stroke-only now. */
  filled?: boolean;
}

export default function TabDiscoverIcon({ size = 22, color = '#8B95A8' }: Props) {
  return <Search size={size} color={color} strokeWidth={1.8} />;
}

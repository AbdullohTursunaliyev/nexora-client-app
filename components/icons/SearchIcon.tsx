import { Search } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
}

export default function SearchIcon({ size = 16, color = '#8B95A8' }: Props) {
  return <Search size={size} color={color} strokeWidth={1.8} />;
}

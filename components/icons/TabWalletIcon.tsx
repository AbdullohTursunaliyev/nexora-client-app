import { Wallet } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  /** See TabHomeIcon — kept on API but unused; we stroke-only now. */
  filled?: boolean;
}

export default function TabWalletIcon({ size = 22, color = '#8B95A8' }: Props) {
  return <Wallet size={size} color={color} strokeWidth={1.8} />;
}

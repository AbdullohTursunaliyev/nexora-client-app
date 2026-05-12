import { Wallet } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  filled?: boolean;
}

export default function WalletIcon({ size = 18, color = '#FFFFFF', filled }: Props) {
  return (
    <Wallet
      size={size}
      color={color}
      fill={filled ? color : 'none'}
      strokeWidth={filled ? 0 : 1.8}
    />
  );
}

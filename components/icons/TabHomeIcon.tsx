import { Home } from 'lucide-react-native';

interface Props {
  size?: number;
  color?: string;
  /**
   * Kept on the API for back-compat with the CustomTabBar caller. We
   * intentionally don't use it any more — when a tab is selected the
   * icon switches colour via the `color` prop, NOT a solid fill. The
   * fully-filled look was reading as a chunky cyan blob next to the
   * stroke-only QR FAB; matching every icon to a stroke-only treatment
   * gives the bar a cleaner, consistent visual language.
   */
  filled?: boolean;
}

export default function TabHomeIcon({ size = 22, color = '#8B95A8' }: Props) {
  return <Home size={size} color={color} strokeWidth={1.8} />;
}

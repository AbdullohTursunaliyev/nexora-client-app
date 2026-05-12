import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  size?: number;
}

export default function NexoraLogo({ size = 120 }: Props) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
      <Defs>
        <LinearGradient id="nexoraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#00E5FF" />
          <Stop offset="50%" stopColor="#7C3AED" />
          <Stop offset="100%" stopColor="#FF40FF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M 14 8 L 14 102 L 30 102 L 30 38 L 70 102 L 86 102 L 86 8 L 70 8 L 70 72 L 30 8 L 14 8 Z"
        fill="url(#nexoraGrad)"
      />
    </Svg>
  );
}

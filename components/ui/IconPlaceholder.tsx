import { View, ViewStyle, StyleProp } from 'react-native';

interface Props {
  size: number;
  style?: StyleProp<ViewStyle>;
}

export default function IconPlaceholder({ size, style }: Props) {
  return <View style={[{ width: size, height: size }, style]} />;
}

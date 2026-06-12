import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { ColorValue } from 'react-native';

type TabIconProps = {
  name: SymbolViewProps['name'];
  color: ColorValue;
  size?: number;
};

export function TabIcon({ name, color, size = 24 }: TabIconProps) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}

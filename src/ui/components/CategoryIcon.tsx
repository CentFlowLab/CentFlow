import { View } from 'react-native';

import { categorySwatch, radius, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: string;
  color: string;
  size?: number;
};

/** Ícone de categoria/conta com a cor da paleta. */
export function CategoryIcon({ icon, color, size = 36 }: Props) {
  const { scheme } = useTheme();
  const swatch = categorySwatch(color, scheme);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        backgroundColor: swatch.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon as IconName} size={Math.round(size * 0.5)} colorValue={swatch.foreground} />
    </View>
  );
}

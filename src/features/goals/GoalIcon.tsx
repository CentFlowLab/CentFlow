import { View } from 'react-native';

import { Icon, type IconName } from '@/ui/components';
import { categorySwatch, radius, useTheme } from '@/ui/theme';

export const DEFAULT_GOAL_ICON = 'flag-outline';
export const DEFAULT_GOAL_COLOR = 'green';

/** Ícone circular de um objetivo, com a cor da paleta das categorias. */
export function GoalIcon({
  icon,
  color,
  size = 44,
  done = false,
}: {
  icon: string;
  color: string;
  size?: number;
  /** Concluído: visto esmeralda em vez do ícone. */
  done?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const swatch = categorySwatch(color, scheme);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: done ? colors.positive : swatch.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon
        name={(done ? 'checkmark' : icon) as IconName}
        size={Math.round(size * 0.5)}
        colorValue={done ? colors.surface : swatch.foreground}
      />
    </View>
  );
}

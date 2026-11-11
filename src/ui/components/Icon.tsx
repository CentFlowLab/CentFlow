import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColors } from '../theme';
import { CustomIcon, isCustomIcon, type CustomIconName } from './CustomIcon';

/** Ionicons ou um dos ícones desenhados para o Miven (`miven-…`). */
export type IconName = ComponentProps<typeof Ionicons>['name'] | CustomIconName;

type Props = {
  name: IconName;
  size?: number;
  /** Cor semântica do tema; `colorValue` tem prioridade quando definido. */
  color?: keyof ThemeColors;
  colorValue?: string;
};

export function Icon({ name, size = 20, color = 'text', colorValue }: Props) {
  const { colors } = useTheme();
  const tint = colorValue ?? colors[color];
  if (isCustomIcon(name)) return <CustomIcon name={name} size={size} color={tint} />;
  return (
    <Ionicons
      name={name}
      size={size}
      color={tint}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

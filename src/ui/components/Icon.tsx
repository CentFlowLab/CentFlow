import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  /** Cor semântica do tema; `colorValue` tem prioridade quando definido. */
  color?: keyof ThemeColors;
  colorValue?: string;
};

export function Icon({ name, size = 20, color = 'text', colorValue }: Props) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={colorValue ?? colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

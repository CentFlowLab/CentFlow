import { Pressable, type PressableProps } from 'react-native';

import { layout, radius, useTheme, type ThemeColors } from '../theme';
import { Icon, type IconName } from './Icon';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  icon: IconName;
  /** Obrigatório: botões só com ícone precisam de rótulo para leitores de ecrã. */
  accessibilityLabel: string;
  variant?: 'plain' | 'filled';
  color?: keyof ThemeColors;
  size?: number;
};

export function IconButton({
  icon,
  variant = 'plain',
  color = 'text',
  size = 20,
  disabled,
  ...rest
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => ({
        width: layout.minTouchTarget,
        height: layout.minTouchTarget,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed
          ? colors.border
          : variant === 'filled'
            ? colors.surfaceMuted
            : 'transparent',
        opacity: disabled ? 0.4 : 1,
      })}
      {...rest}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

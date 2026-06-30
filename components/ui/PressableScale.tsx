import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { pressScale } from '@/lib/theme';

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  scale?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Wrapper de press com feedback tátil visual (scale + opacity).
 */
export function PressableScale({
  scale = pressScale.default,
  style,
  children,
  disabled,
  ...props
}: PressableScaleProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && !disabled && { opacity: 0.88, transform: [{ scale }] },
      ]}
      {...props}>
      {children}
    </Pressable>
  );
}

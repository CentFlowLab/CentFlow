import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Cor do ícone quando não selecionado (ex.: cor da categoria). */
  iconColorValue?: string;
  accessibilityHint?: string;
  disabled?: boolean;
};

/** Opção compacta de escolha (usar dentro de um contentor com role "radiogroup"). */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  iconColorValue,
  accessibilityHint,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const foreground = selected ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : pressed ? colors.border : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <View style={styles.content}>
        {icon ? (
          <Icon
            name={icon}
            size={16}
            colorValue={selected ? foreground : (iconColorValue ?? colors.textSecondary)}
          />
        ) : null}
        <Text variant="label" style={{ color: foreground }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
});

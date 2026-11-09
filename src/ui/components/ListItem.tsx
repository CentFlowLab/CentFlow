import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, radius, spacing, useTheme, type ThemeColors } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: keyof ThemeColors;
  iconBackground?: keyof ThemeColors;
  /** Elemento à esquerda personalizado (substitui `icon`). */
  leading?: ReactNode;
  /** Conteúdo à direita (valor, badge, interruptor…). */
  trailing?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Torna a linha uma opção de escolha única (usar dentro de um contentor "radiogroup"). */
  selected?: boolean;
};

export function ListItem({
  title,
  subtitle,
  icon,
  iconColor = 'primaryText',
  iconBackground = 'primaryMuted',
  leading,
  trailing,
  showChevron = true,
  onPress,
  accessibilityHint,
  selected,
}: Props) {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);

  const content = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.icon, { backgroundColor: colors[iconBackground] }]}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
        ) : null)}
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && showChevron ? (
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        styles.pressable,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressable: {
    borderRadius: radius.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
});

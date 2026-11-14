import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/ui/components';
import { floatingTabBarBottom } from '@/ui/layout/floatingTabBar';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

import {
  isMoreActive,
  MOBILE_PRIMARY_ITEMS,
  NEW_TRANSACTION_HREF,
  type TabRouteName,
} from '../nav-items';
import { useHaptics } from '../../preferences';

type Props = {
  activeRoute: string | undefined;
  onSelect: (route: TabRouteName) => void;
  /** Chamado ao tocar em "+" (ex.: vibração), antes de abrir o registo. */
  onNewTransaction?: () => void;
};

/** Esconde a ilha com o teclado aberto (no Android, a janela encolhe e a barra subia). */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const shown = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return open;
}

/**
 * Barra inferior do telemóvel em "ilha" flutuante (ADR-075): cápsula separada das margens, com o
 * conteúdo a passar por trás. Três separadores, o "+" e "Mais"; o ativo tem uma pílula verde suave.
 */
export function MobileTabBar({ activeRoute, onSelect, onNewTransaction }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const haptic = useHaptics();
  if (keyboardOpen) return null;

  const [first, second, ...rest] = MOBILE_PRIMARY_ITEMS;
  const leading = [first, second].filter((item) => item !== undefined);

  const tab = (
    route: TabRouteName,
    label: string,
    icon: IconName,
    activeIcon: IconName,
    active: boolean,
  ) => (
    <TabButton
      key={route}
      label={label}
      icon={active ? activeIcon : icon}
      active={active}
      onPress={() => onSelect(route)}
    />
  );

  // Na web, o desfoque do que está por trás (onde o browser o suporta); no nativo, só a cor.
  const glass: ViewStyle =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: `0 8px 24px ${colors.shadow}`,
        } as unknown as ViewStyle)
      : {
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('nav.mainNavigation')}
      style={[
        styles.island,
        glass,
        {
          left: spacing.lg + insets.left,
          right: spacing.lg + insets.right,
          bottom: floatingTabBarBottom(insets.bottom),
          backgroundColor: colors.tabBarGlass,
          borderColor: colors.border,
        },
      ]}>
      {leading.map((item) =>
        tab(
          item.route,
          t(`nav.${item.key}`),
          item.icon,
          item.activeIcon,
          activeRoute === item.route,
        ),
      )}

      <View style={styles.addSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.newTransaction')}
          onPress={() => {
            haptic.impactLight();
            onNewTransaction?.();
            router.push(NEW_TRANSACTION_HREF);
          }}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}>
          <Icon name="add" size={24} color="onPrimary" />
        </Pressable>
      </View>

      {rest.map((item) =>
        tab(
          item.route,
          t(`nav.${item.key}`),
          item.icon,
          item.activeIcon,
          activeRoute === item.route,
        ),
      )}
      {tab(
        'more',
        t('nav.more'),
        'ellipsis-horizontal-circle-outline',
        'ellipsis-horizontal-circle',
        isMoreActive(activeRoute),
      )}
    </View>
  );
}

type TabButtonProps = {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.slot, styles.tab, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.pill, active && { backgroundColor: colors.primaryMuted }]}>
        <Icon name={icon} size={22} color={active ? 'primaryText' : 'textTertiary'} />
      </View>
      <Text
        variant="caption"
        tone={active ? 'accent' : 'tertiary'}
        numberOfLines={1}
        style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  island: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.floatingTabBarHeight,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
  },
  slot: {
    flex: 1,
    height: layout.floatingTabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    gap: spacing.xxs,
    minWidth: 0,
  },
  // O "+" ocupa só o seu círculo: sobra largura para os rótulos dos separadores.
  addSlot: {
    width: layout.minTouchTarget + spacing.sm,
    height: layout.floatingTabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Um pouco mais compacto que a legenda normal: "Movimentos" e "Orçamentos" cabem inteiros.
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
  },
  pill: {
    width: 52,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { spacing, useTheme, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

type SettingsScreenLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SettingsScreenLayout({
  title,
  subtitle,
  children,
}: SettingsScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="detail"
        title={title}
        subtitle={subtitle}
        showBack
        showAvatar={false}
      />
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'ios' ? 48 : 24}
        extraHeight={100}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
        ]}>
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}

type SettingsHeroProps = {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
};

export function SettingsHero({ icon, title, description }: SettingsHeroProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <SymbolView name={icon} tintColor={colors.primary} size={24} />
      </View>
      <View style={styles.heroText}>
        <Text variant="h3">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {description}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.lg,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: {
      flex: 1,
      gap: spacing.xs,
    },
  });
}

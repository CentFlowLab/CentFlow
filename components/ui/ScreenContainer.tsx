import { ScrollView, StyleSheet, View, ViewProps } from 'react-native';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, spacing } from '@/lib/theme';

type ScreenContainerProps = ViewProps & {
  scrollable?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  /**
   * Quando false (ecrãs dentro das tabs), não aplica insets.bottom —
   * o navigator já reserva espaço para a tab bar.
   */
  applyBottomSafeInset?: boolean;
};

export function ScreenContainer({
  scrollable = true,
  padded = true,
  edges = ['bottom'],
  applyBottomSafeInset = true,
  style,
  children,
  ...props
}: ScreenContainerProps) {
  const { navigationBarInset, contentBottomPadding } = useResponsiveLayout();

  const bottomPadding = edges.includes('bottom')
    ? applyBottomSafeInset
      ? Math.max(navigationBarInset, spacing.lg)
      : contentBottomPadding
    : 0;

  const contentStyle = [
    styles.content,
    padded && styles.padded,
    bottomPadding > 0 && { paddingBottom: bottomPadding },
    style,
  ];

  if (scrollable) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[contentStyle, styles.scrollContent]}
        showsVerticalScrollIndicator={false}
        {...props}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, contentStyle]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});

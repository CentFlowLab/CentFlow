import { ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/lib/theme';

type ScreenContainerProps = ViewProps & {
  scrollable?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
};

export function ScreenContainer({
  scrollable = true,
  padded = true,
  edges = ['bottom'],
  style,
  children,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const contentStyle = [
    styles.content,
    padded && styles.padded,
    edges.includes('bottom') && { paddingBottom: Math.max(insets.bottom, spacing.lg) },
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

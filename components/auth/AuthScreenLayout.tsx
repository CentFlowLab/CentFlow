import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type AuthScreenLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Text variant="label" color="primary">
            CentFlow
          </Text>
          <Text variant="caption" color="textMuted">
            Where does it go?
          </Text>
        </View>

        <View style={styles.header}>
          <Text variant="h1">{title}</Text>
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        </View>

        <View style={styles.form}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
  },
  brand: {
    gap: spacing.xs,
    marginBottom: spacing['3xl'],
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  form: {
    gap: spacing.lg,
  },
  footer: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
});

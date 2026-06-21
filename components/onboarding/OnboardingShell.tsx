import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/ui';
import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar';
import { colors, spacing } from '@/lib/theme';

type OnboardingShellProps = {
  children: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  progress?: number;
  progressLabel?: string;
  showProgress?: boolean;
  footer?: ReactNode;
};

export function OnboardingShell({
  children,
  onBack,
  showBack = false,
  progress = 0,
  progressLabel,
  showProgress = false,
  footer,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom },
      ]}>
      <View style={styles.topBar}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              tintColor={colors.textSecondary}
              size={22}
            />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <Text variant="label" color="textMuted">
          CentFlow
        </Text>

        <View style={styles.backPlaceholder} />
      </View>

      {showProgress ? (
        <View style={styles.progressWrap}>
          <OnboardingProgressBar progress={progress} label={progressLabel} />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}>
        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 36,
    padding: spacing.xs,
  },
  backPlaceholder: {
    width: 36,
  },
  progressWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  kav: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

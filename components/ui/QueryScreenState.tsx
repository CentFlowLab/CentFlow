import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/lib/theme';
import type { ScreenErrorContext } from '@/lib/api/errors';

import { ErrorState } from './ErrorState';
import { LoadingSpinner } from './LoadingSpinner';

type QueryScreenStateProps = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  context: ScreenErrorContext;
  loading?: React.ReactNode;
  loadingMessage?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Encapsula o padrão loading → erro → conteúdo dos ecrãs com React Query.
 */
export function QueryScreenState({
  isLoading,
  isError,
  error,
  onRetry,
  isRetrying = false,
  context,
  loading,
  loadingMessage,
  children,
  style,
}: QueryScreenStateProps) {
  if (isLoading) {
    return (
      <View style={[styles.fill, style]}>
        {loading ?? <LoadingSpinner message={loadingMessage} fullScreen />}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.fill, style]}>
        <ErrorState
          context={context}
          error={error}
          onRetry={onRetry}
          retryLoading={isRetrying}
        />
      </View>
    );
  }

  return <>{children}</>;
}

type RefetchingIndicatorProps = {
  visible: boolean;
  message?: string;
};

export function RefetchingIndicator({
  visible,
  message = 'A atualizar...',
}: RefetchingIndicatorProps) {
  if (!visible) return null;

  return (
    <View style={styles.refetching}>
      <LoadingSpinner message={message} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
  refetching: {
    paddingVertical: spacing.md,
  },
});

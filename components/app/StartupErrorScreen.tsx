import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui';
import { colors } from '@/lib/theme';

type StartupErrorScreenProps = {
  error?: unknown;
  message?: string;
  onRetry: () => void;
  retryLoading?: boolean;
};

export function StartupErrorScreen({
  error,
  message,
  onRetry,
  retryLoading = false,
}: StartupErrorScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ErrorState
          context="generic"
          error={error ?? (message ? new Error(message) : undefined)}
          title="Não foi possível abrir a CentFlow"
          description={
            message ??
            'Ocorreu um problema ao iniciar a aplicação. Verifica a ligação à internet e tenta novamente.'
          }
          onRetry={onRetry}
          retryLoading={retryLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});

import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/lib/theme';

import { LoadingSpinner } from './LoadingSpinner';

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
  refetching: {
    paddingVertical: spacing.md,
  },
});

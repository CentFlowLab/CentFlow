import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/lib/theme';

import { Text } from './Text';

type LoadingSpinnerProps = {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LoadingSpinner({
  message,
  size = 'large',
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator color={colors.primary} size={size} />
      {message ? (
        <Text variant="caption" color="textMuted" align="center">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
  },
  fullScreen: {
    flex: 1,
  },
});

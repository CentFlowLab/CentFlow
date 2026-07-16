import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';

type AppleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function AppleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = 'Continuar com Apple',
}: AppleSignInButtonProps) {
  return (
    <Button
      label={label}
      variant="secondary"
      size="lg"
      fullWidth
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={
        <View style={styles.iconBadge}>
          <View style={styles.appleMark} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleMark: {
    width: 14,
    height: 16,
    backgroundColor: colors.text,
    borderRadius: 2,
  },
});

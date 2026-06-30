import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';

type AppleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AppleSignInButton({
  onPress,
  loading = false,
  disabled = false,
}: AppleSignInButtonProps) {
  return (
    <Button
      label="Continuar com Apple"
      variant="secondary"
      size="lg"
      fullWidth
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={
        <View style={styles.iconBadge}>
          <View style={styles.appleLogo} />
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
  appleLogo: {
    width: 14,
    height: 16,
    backgroundColor: colors.text,
    borderRadius: 2,
    transform: [{ scaleX: 0.7 }],
  },
});

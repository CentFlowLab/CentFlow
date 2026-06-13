import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';

type GoogleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = 'Continuar com Google',
}: GoogleSignInButtonProps) {
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
          <View style={styles.googleG}>
            <View style={[styles.googleSegment, styles.googleBlue]} />
            <View style={[styles.googleSegment, styles.googleGreen]} />
            <View style={[styles.googleSegment, styles.googleYellow]} />
            <View style={[styles.googleSegment, styles.googleRed]} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  googleG: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  googleSegment: {
    position: 'absolute',
    width: 7,
    height: 7,
  },
  googleBlue: {
    top: 0,
    right: 0,
    backgroundColor: '#4285F4',
  },
  googleGreen: {
    bottom: 0,
    left: 0,
    backgroundColor: '#34A853',
  },
  googleYellow: {
    bottom: 0,
    right: 0,
    backgroundColor: '#FBBC05',
  },
  googleRed: {
    top: 0,
    left: 0,
    backgroundColor: '#EA4335',
  },
});

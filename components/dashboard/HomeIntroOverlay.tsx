import { Image } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

const LOGO = require('@/assets/brand/logo-mark-transparent.png');

let introPlayedThisSession = false;

type HomeIntroOverlayProps = {
  onComplete: () => void;
};

/**
 * Breve transição do logo para o ecrã Início (uma vez por sessão da app).
 */
export function HomeIntroOverlay({ onComplete }: HomeIntroOverlayProps) {
  const [visible, setVisible] = useState(!introPlayedThisSession);
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.72);
  const logoOpacity = useSharedValue(0);

  const finish = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (introPlayedThisSession) {
      onComplete();
      return;
    }

    introPlayedThisSession = true;

    logoOpacity.value = withTiming(1, { duration: 280 });
    logoScale.value = withSequence(
      withTiming(1.08, { duration: 520 }),
      withTiming(1, { duration: 180 }),
    );

    overlayOpacity.value = withDelay(
      900,
      withTiming(0, { duration: 420 }, (finished) => {
        if (finished) {
          runOnJS(finish)();
        }
      }),
    );
  }, [finish, logoOpacity, logoScale, onComplete, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 50,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
});

import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markIntroCompletedThisSession } from '@/lib/app/intro-session';

const INTRO_VIDEO = require('@/assets/videos/centflow-launch-intro.mp4');
const LOGO_FALLBACK = require('@/assets/brand/logo-mark-transparent.png');

/** Fallback de segurança se o evento de fim do vídeo falhar. */
const INTRO_MAX_MS = 20000;
const FALLBACK_LOGO_MS = 1600;
const FADE_MS = 420;

type AppIntroSplashProps = {
  onComplete: () => void;
};

/**
 * Splash de lançamento em ecrã inteiro — montado fora da navegação principal.
 * Sem interação durante a reprodução; fade out ao terminar.
 */
export function AppIntroSplash({ onComplete }: AppIntroSplashProps) {
  const insets = useSafeAreaInsets();
  const [useFallback, setUseFallback] = useState(Platform.OS === 'web');
  const finishedRef = useRef(false);
  const overlayOpacity = useSharedValue(1);

  const player = useVideoPlayer(INTRO_VIDEO, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroCompletedThisSession();
    onComplete();
  }, [onComplete]);

  const dismissWithFade = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: FADE_MS }, (done) => {
      if (done) {
        runOnJS(finish)();
      }
    });
  }, [finish, overlayOpacity]);

  useEffect(() => {
    if (useFallback) {
      const timer = setTimeout(dismissWithFade, FALLBACK_LOGO_MS);
      return () => clearTimeout(timer);
    }

    player.play();

    const maxTimer = setTimeout(dismissWithFade, INTRO_MAX_MS);

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (error) {
        setUseFallback(true);
      }
      if (status === 'readyToPlay' && !finishedRef.current) {
        player.play();
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      clearTimeout(maxTimer);
      dismissWithFade();
    });

    return () => {
      clearTimeout(maxTimer);
      statusSub.remove();
      endSub.remove();
    };
  }, [dismissWithFade, player, useFallback]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="auto">
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}>
        {useFallback ? (
          <View style={styles.center}>
            <Image source={LOGO_FALLBACK} style={styles.logoFallback} resizeMode="contain" />
          </View>
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallback: {
    width: 128,
    height: 128,
  },
});

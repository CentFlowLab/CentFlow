import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/lib/theme';

const INTRO_VIDEO = require('@/assets/videos/app-intro.mp4');
const LOGO_FALLBACK = require('@/assets/brand/logo-mark-transparent.png');

/** Máximo antes de fechar a intro (fallback se o evento de fim falhar). */
const INTRO_MAX_MS = 8000;

let introDoneThisSession = false;

type HomeIntroOverlayProps = {
  onComplete: () => void;
};

/**
 * Intro em vídeo ao abrir o Início (uma vez por sessão da app).
 */
export function HomeIntroOverlay({ onComplete }: HomeIntroOverlayProps) {
  const [visible, setVisible] = useState(!introDoneThisSession);
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
    introDoneThisSession = true;
    setVisible(false);
    onComplete();
  }, [onComplete]);

  const dismissWithFade = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 380 }, (done) => {
      if (done) {
        runOnJS(finish)();
      }
    });
  }, [finish, overlayOpacity]);

  useEffect(() => {
    if (introDoneThisSession) {
      onComplete();
      return;
    }

    if (useFallback) {
      const timer = setTimeout(dismissWithFade, 1400);
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
  }, [dismissWithFade, onComplete, player, useFallback]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
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
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 50,
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
    width: 120,
    height: 120,
  },
});

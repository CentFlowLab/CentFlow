import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useAnalisesTabIconReplay } from '@/lib/analises-tab-icon/analises-tab-icon.context';
import { colors } from '@/lib/theme';

const VIDEO_SOURCE = require('@/assets/videos/analises-tab-icon.mp4');

type TabBarAnalisesIconProps = {
  focused: boolean;
};

export function TabBarAnalisesIcon({ focused }: TabBarAnalisesIconProps) {
  const { replayToken } = useAnalisesTabIconReplay();
  const [useFallback, setUseFallback] = useState(Platform.OS === 'web');

  const player = useVideoPlayer(VIDEO_SOURCE, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ error }) => {
      if (error) {
        setUseFallback(true);
      }
    });

    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (useFallback) return;

    player.currentTime = 0;
    player.play();
  }, [focused, replayToken, player, useFallback]);

  if (useFallback) {
    return <AnalisesIconFallback focused={focused} />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.circle, focused && styles.circleFocused]}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      </View>
    </View>
  );
}

function AnalisesIconFallback({ focused }: { focused: boolean }) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={
          focused
            ? [colors.primary, colors.primaryDark]
            : [colors.surfaceElevated, colors.surfaceHighlight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, focused && styles.circleFocused]}>
        <SymbolView
          name={{
            ios: 'chart.pie.fill',
            android: 'pie_chart',
            web: 'pie_chart',
          }}
          tintColor={focused ? colors.textInverse : colors.primary}
          size={focused ? 28 : 24}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    overflow: 'visible',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.tabBar,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  circleFocused: {
    borderColor: colors.background,
    shadowOpacity: 0.4,
  },
  video: {
    width: 56,
    height: 56,
  },
});

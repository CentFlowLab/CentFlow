import {
  StyleSheet,
  Text as RNText,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { CachedStaticImage } from '@/components/ui/CachedImage';

import { colors } from '@/lib/theme';

type OnboardingIllustrationProps = {
  emoji?: string;
  image?: ImageSourcePropType;
  /** Diâmetro do círculo exterior. */
  size?: number;
};

/**
 * Ilustração circular do onboarding. Usa dois círculos concêntricos (sem
 * overflow: hidden) e um emoji com lineHeight proporcional ao tamanho — evita
 * o corte vertical que acontece quando se herda o lineHeight do tipo de texto.
 */
export function OnboardingIllustration({
  emoji,
  image,
  size = 120,
}: OnboardingIllustrationProps) {
  const innerSize = Math.round(size * 0.62);
  const emojiSize = Math.round(innerSize * 0.6);

  return (
    <View
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <View
        style={[
          styles.inner,
          { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
        ]}>
        {emoji ? (
          <RNText
            allowFontScaling={false}
            style={{
              fontSize: emojiSize,
              lineHeight: Math.round(emojiSize * 1.25),
              textAlign: 'center',
            }}>
            {emoji}
          </RNText>
        ) : image ? (
          <CachedStaticImage
            source={image}
            style={{ width: innerSize * 0.7, height: innerSize * 0.7 }}
            contentFit="contain"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});

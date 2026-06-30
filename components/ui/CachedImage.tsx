import { Image, type ImageContentFit, type ImageProps } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

import { colors } from '@/lib/theme';

type CachedImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
};

/**
 * Wrapper em expo-image com cache em disco/memória para URIs locais e remotas.
 */
export function CachedImage({
  uri,
  style,
  contentFit = 'cover',
  accessibilityLabel,
}: CachedImageProps) {
  return (
    <Image
      source={{ uri }}
      style={[styles.base, style]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      accessibilityLabel={accessibilityLabel}
      transition={120}
    />
  );
}

type CachedStaticImageProps = Pick<ImageProps, 'source' | 'style' | 'contentFit' | 'accessibilityLabel'>;

export function CachedStaticImage({
  source,
  style,
  contentFit = 'contain',
  accessibilityLabel,
}: CachedStaticImageProps) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceHighlight,
  },
});

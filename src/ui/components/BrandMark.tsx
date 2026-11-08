import { Image } from 'react-native';

const MARK = require('../../../assets/splash-icon.png');

/** Logótipo da marca; a imagem é gerada por scripts/generate-brand-assets.mjs. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

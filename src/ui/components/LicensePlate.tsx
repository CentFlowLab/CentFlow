import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fontFamily, PLATE_COLORS, spacing } from '../theme';
import { Text } from './Text';

type Props = {
  /** O valor guardado: só é mostrado em maiúsculas, nunca reformatado. */
  value: string;
  /** País da faixa (quem chama deteta o formato); sem país, só as estrelas. */
  country?: 'PT' | null;
  accessibilityLabel: string;
};

/** Altura do chip de matrícula anterior: caption (16) + 2 × 2 de margem + 2 × 1,5 de borda. */
const PLATE_HEIGHT = 23;
const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return { cx: 5 + Math.cos(a) * 3.6, cy: 5 + Math.sin(a) * 3.6 };
});

/**
 * Matrícula com o aspeto de uma placa europeia (ADR-078): fundo branco, faixa azul com o anel de
 * estrelas e o código do país. Cores fixas: uma matrícula real é branca em claro e em escuro.
 * Só apresentação: o texto é o valor recebido em maiúsculas.
 */
export function LicensePlate({ value, country = null, accessibilityLabel }: Props) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={styles.plate}>
      <View
        style={styles.band}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <Svg width={9} height={9} viewBox="0 0 10 10">
          {STARS.map((star, index) => (
            <Circle key={index} cx={star.cx} cy={star.cy} r={0.8} fill={PLATE_COLORS.euYellow} />
          ))}
        </Svg>
        {country ? (
          <Text variant="caption" maxFontSizeMultiplier={1} style={styles.country}>
            {country === 'PT' ? 'P' : country}
          </Text>
        ) : null}
      </View>
      <Text
        variant="caption"
        tabular
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={styles.text}>
        {value.toLocaleUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexShrink: 0,
    minHeight: PLATE_HEIGHT,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PLATE_COLORS.border,
    backgroundColor: PLATE_COLORS.background,
    overflow: 'hidden',
  },
  band: {
    width: 11,
    backgroundColor: PLATE_COLORS.euBlue,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 1,
  },
  country: {
    color: PLATE_COLORS.bandText,
    fontFamily: fontFamily.bold,
    fontSize: 7,
    lineHeight: 8,
    letterSpacing: 0,
  },
  text: {
    color: PLATE_COLORS.text,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.6,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
  },
});

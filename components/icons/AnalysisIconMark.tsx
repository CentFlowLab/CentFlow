import { memo } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { colors } from '@/lib/theme';

const HEX_OUTER = 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z';
const HEX_INNER = 'M50 14 L82 32 L82 68 L50 86 L18 68 L18 32 Z';

/**
 * Três faixas curvas em fluxo — "C" analítico com setas.
 * Inspirado no emblema CentFlow Analysis (hexágono + fluxo circular).
 */
const ARROW_OUTER =
  'M64 24 A32 32 0 0 0 24 50 A28 28 0 0 0 64 76 L58 72 A24 24 0 0 1 30 50 A26 26 0 0 1 58 28 Z';
const ARROW_MID =
  'M62 34 A24 24 0 0 0 32 50 A20 20 0 0 0 62 66 L58 62 A16 16 0 0 1 38 50 A18 18 0 0 1 58 38 Z';
const ARROW_INNER =
  'M60 42 A16 16 0 0 0 40 50 A14 14 0 0 0 60 58 L57 55 A11 11 0 0 1 44 50 A12 12 0 0 1 57 45 Z';

type AnalysisIconMarkProps = {
  size?: number;
  active?: boolean;
};

export const AnalysisIconMark = memo(function AnalysisIconMark({
  size = 28,
  active = false,
}: AnalysisIconMarkProps) {
  const strokeMain = active ? colors.primary : colors.textMuted;
  const strokeAccent = active ? colors.primaryDark : 'rgba(120, 133, 154, 0.5)';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="flowGrad" x1="18" y1="18" x2="72" y2="82">
          <Stop offset="0" stopColor={active ? '#5EEAD4' : '#9CA8B8'} />
          <Stop offset="0.55" stopColor={active ? colors.primary : colors.textMuted} />
          <Stop offset="1" stopColor={active ? colors.primaryDark : '#5C6A7E'} />
        </LinearGradient>
        <LinearGradient id="flowGradSoft" x1="30" y1="30" x2="66" y2="70">
          <Stop offset="0" stopColor={active ? '#99F6E4' : '#B0BAC8'} />
          <Stop offset="1" stopColor={active ? '#2DD4BF' : colors.textMuted} />
        </LinearGradient>
      </Defs>

      {active ? (
        <Circle cx="50" cy="50" r="42" fill={colors.primaryGlow} opacity={0.18} />
      ) : null}

      <G opacity={active ? 1 : 0.78}>
        <Polygon
          points={HEX_OUTER}
          stroke={strokeMain}
          strokeWidth={active ? 2 : 1.6}
          fill="none"
          opacity={active ? 0.9 : 0.65}
        />
        <Polygon
          points={HEX_INNER}
          stroke={strokeAccent}
          strokeWidth={1}
          fill="none"
          opacity={active ? 0.5 : 0.32}
        />

        <Path d={ARROW_OUTER} fill="url(#flowGrad)" />
        <Path d={ARROW_MID} fill="url(#flowGradSoft)" opacity={active ? 0.92 : 0.75} />
        <Path
          d={ARROW_INNER}
          fill={active ? colors.primary : colors.textMuted}
          opacity={active ? 0.95 : 0.8}
        />

        {/* Pontas de seta */}
        <Path d="M64 76 L70 80 L64 70 Z" fill={active ? colors.primaryDark : colors.textMuted} />
        <Path d="M62 66 L67 69 L61 61 Z" fill={active ? '#5EEAD4' : '#8B9BB0'} />
        <Path d="M60 58 L64 60 L58 54 Z" fill={active ? colors.primary : colors.textMuted} />
      </G>

      {active ? (
        <>
          <Circle cx="20" cy="22" r="1.1" fill={colors.primary} opacity={0.65} />
          <Circle cx="80" cy="28" r="0.9" fill="#5EEAD4" opacity={0.5} />
          <Circle cx="76" cy="76" r="1" fill={colors.primary} opacity={0.4} />
        </>
      ) : null}
    </Svg>
  );
});

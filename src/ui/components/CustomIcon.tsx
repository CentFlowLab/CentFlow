import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Ícones desenhados para o Miven no estilo dos Ionicons "outline" (ADR-053): grelha de 512,
 * traço de 32, pontas e cantos redondos, sem preenchimento. Nomes com o prefixo `miven-`.
 */
export const CUSTOM_ICONS = {
  /** Tabaco: cigarro com filtro e fumo. */
  'miven-cigarette': [
    'M56 304h376a16 16 0 0 1 16 16v64a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16v-64a16 16 0 0 1 16-16z',
    'M336 304v96',
    'M368 240c0-40 32-48 32-80s-32-40-32-80',
    'M440 240c0-40 32-48 32-80s-32-40-32-80',
  ],
  /** Combustível: bomba de abastecimento com mangueira. */
  'miven-fuel': [
    'M120 448V96a32 32 0 0 1 32-32h112a32 32 0 0 1 32 32v352',
    'M88 448h240',
    'M152 128h112v80H152z',
    'M296 240h32a24 24 0 0 1 24 24v104a24 24 0 0 0 48 0V184l-48-56',
  ],
} as const;

export type CustomIconName = keyof typeof CUSTOM_ICONS;

export function isCustomIcon(name: string): name is CustomIconName {
  return Object.prototype.hasOwnProperty.call(CUSTOM_ICONS, name);
}

export function CustomIcon({
  name,
  size,
  color,
}: {
  name: CustomIconName;
  size: number;
  color: string;
}) {
  return (
    // As propriedades de acessibilidade ficam na View: na web, o Svg passava-as ao HTML.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 512 512">
        {CUSTOM_ICONS[name].map((d) => (
          <Path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={32}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

import { createContext, useContext, type ReactNode } from 'react';

import type { FormatRegion } from './languages';

/** Escolhas de apresentação que mudam a formatação (Definições › Preferências, ADR-076). */
export type FormatSettings = {
  /** 'auto' = idioma da interface e região do aparelho (como sempre). */
  formatRegion: 'auto' | FormatRegion;
  /** Modo discreto: valores monetários escondidos no ecrã. */
  discreetAmounts: boolean;
};

const DEFAULT_FORMAT_SETTINGS: FormatSettings = { formatRegion: 'auto', discreetAmounts: false };

const FormatSettingsContext = createContext<FormatSettings>(DEFAULT_FORMAT_SETTINGS);

export function FormatSettingsProvider({
  value,
  children,
}: {
  value: FormatSettings;
  children: ReactNode;
}) {
  return <FormatSettingsContext.Provider value={value}>{children}</FormatSettingsContext.Provider>;
}

export function useFormatSettings(): FormatSettings {
  return useContext(FormatSettingsContext);
}

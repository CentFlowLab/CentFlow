/** Durações e configs de animação partilhadas — CentFlow branding. */
export const animation = {
  /** Transição de conteúdo entre tabs/filtros */
  contentFade: 200,
  /** Pulse do skeleton loading */
  skeletonPulse: 900,
  /** Abertura de bottom sheet */
  sheetOpen: 280,
  /** Fecho de bottom sheet */
  sheetClose: 240,
  /** Press feedback rápido */
  press: 150,
  /** Entrada de empty states */
  emptyEnter: 320,
} as const;

export const spring = {
  sheet: { damping: 22, stiffness: 280, mass: 0.85 },
  press: { damping: 15, stiffness: 400, mass: 0.6 },
} as const;

export const pressScale = {
  default: 0.96,
  subtle: 0.98,
  chip: 0.97,
} as const;

import { radius, spacing } from './spacing';

/** Alturas e espaçamentos de formulários — usar em modais e bottom sheets. */
export const layout = {
  inputHeight: 48,
  buttonHeight: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  chipHeight: 36,
  cardRadius: radius.lg,
  bottomSheetPadding: spacing.lg,
  /** Reserva no scroll para botões finais (altura lg + margem). */
  formFooterReserve: 96,
} as const;

/** Escala vertical consistente para modais. */
export const formSpacing = {
  /** Entre título e subtítulo no header. */
  titleToSubtitle: spacing.lg,
  /** Entre label e input. */
  labelToInput: spacing.sm,
  /** Entre campos do mesmo grupo. */
  fieldGap: spacing.lg,
  /** Entre grupos de campos. */
  groupGap: spacing['2xl'],
  /** Entre secções (ex.: Meta vs Progresso). */
  sectionGap: spacing['3xl'],
  /** Antes dos botões finais. */
  footerTop: spacing['3xl'],
  /** Gap entre botões no footer. */
  footerGap: spacing.md,
  /** Padding inferior do conteúdo do sheet. */
  contentBottom: spacing['3xl'],
} as const;

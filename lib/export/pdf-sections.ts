export type PdfSectionId =
  | 'patrimonio'
  | 'composicao'
  | 'perfil'
  | 'movimentos'
  | 'objetivos'
  | 'ativos'
  | 'subscricoes';

export type PdfSectionSelection = Record<PdfSectionId, boolean>;

export type PdfSectionOption = {
  id: PdfSectionId;
  label: string;
  description: string;
  required?: boolean;
};

export const PDF_SECTION_OPTIONS: PdfSectionOption[] = [
  {
    id: 'patrimonio',
    label: 'Património',
    description: 'Património líquido, variação e gastos da semana.',
    required: true,
  },
  {
    id: 'composicao',
    label: 'Composição do património',
    description: 'Contas, inventário, investimentos e passivos.',
  },
  {
    id: 'perfil',
    label: 'Perfil financeiro',
    description: 'Pontuação e nível do teu perfil CentFlow.',
  },
  {
    id: 'movimentos',
    label: 'Movimentos recentes',
    description: 'Últimos 8 movimentos registados.',
  },
  {
    id: 'objetivos',
    label: 'Objetivos',
    description: 'Metas de poupança e progresso.',
  },
  {
    id: 'ativos',
    label: 'Ativos',
    description: 'Garantias e inventário.',
  },
  {
    id: 'subscricoes',
    label: 'Subscrições',
    description: 'Custos recorrentes mensais.',
  },
];

export const DEFAULT_PDF_SECTIONS: PdfSectionSelection = {
  patrimonio: true,
  composicao: true,
  perfil: true,
  movimentos: true,
  objetivos: true,
  ativos: true,
  subscricoes: true,
};

export function normalizePdfSections(selection: PdfSectionSelection): PdfSectionSelection {
  return {
    ...selection,
    patrimonio: true,
  };
}

export function countSelectedPdfSections(selection: PdfSectionSelection): number {
  return PDF_SECTION_OPTIONS.filter((option) => selection[option.id]).length;
}

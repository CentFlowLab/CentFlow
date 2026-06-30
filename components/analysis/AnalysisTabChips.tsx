import { FilterChips } from '@/components/ui/FilterChips';

type AnalysisTabKey = 'resumo' | 'gastos' | 'divida' | 'patrimonio';

const TABS: Array<{ key: AnalysisTabKey; label: string }> = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'divida', label: 'Dívida' },
  { key: 'patrimonio', label: 'Património' },
];

type AnalysisTabChipsProps = {
  value: AnalysisTabKey;
  onChange: (value: AnalysisTabKey) => void;
};

export function AnalysisTabChips({ value, onChange }: AnalysisTabChipsProps) {
  return (
    <FilterChips
      chips={TABS}
      value={value}
      onChange={onChange}
      padded={false}
      bottomSpacing
    />
  );
}

export type { AnalysisTabKey };

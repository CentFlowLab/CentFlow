import { FilterChips } from '@/components/ui/FilterChips';

export type MovementTab = 'all' | 'expense' | 'income' | 'subscricoes';

const CHIPS: Array<{ key: MovementTab; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'expense', label: 'Despesas' },
  { key: 'income', label: 'Receitas' },
  { key: 'subscricoes', label: 'Fixos' },
];

type MovementFilterChipsProps = {
  value: MovementTab;
  onChange: (value: MovementTab) => void;
};

export function MovementFilterChips({ value, onChange }: MovementFilterChipsProps) {
  return <FilterChips chips={CHIPS} value={value} onChange={onChange} padded={false} />;
}

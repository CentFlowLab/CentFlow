import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { MonthKey } from '@/core/finance';
import { renderWithProviders } from '@/test-utils/render';

import { MonthSwitcher } from '../MonthSwitcher';

const changes: MonthKey[] = [];

function Harness({ start = '2026-11' as MonthKey }) {
  const [month, setMonth] = useState<MonthKey>(start);
  return (
    <MonthSwitcher
      month={month}
      currentMonth="2026-11"
      onChange={(next) => {
        changes.push(next);
        setMonth(next);
      }}
    />
  );
}

beforeEach(() => {
  changes.length = 0;
});

describe('MonthSwitcher', () => {
  it('keeps the arrows working as before', async () => {
    await renderWithProviders(<Harness />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Mês anterior' }));
    expect(changes).toEqual(['2026-10']);
    await fireEvent.press(screen.getByRole('button', { name: 'Mês seguinte' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês seguinte' }));
    expect(changes.at(-1)).toBe('2026-12');
  });

  it('opens the month picker from the month and reaches 2025 in three taps', async () => {
    await renderWithProviders(<Harness />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Novembro de 2026, escolher mês' }),
    );
    expect(screen.getByText('Escolher mês')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'novembro de 2026' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Ano anterior' }));
    expect(screen.getByText('2025')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'junho de 2025' }));
    expect(changes).toEqual(['2025-06']);
    expect(screen.queryByText('Escolher mês')).toBeNull();
    expect(screen.getByRole('button', { name: 'Junho de 2025, escolher mês' })).toBeOnTheScreen();
  });

  it('goes back to the current month from the picker', async () => {
    await renderWithProviders(<Harness start="2024-02" />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Fevereiro de 2024/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês atual' }));
    expect(changes).toEqual(['2026-11']);
    expect(screen.queryByText('Escolher mês')).toBeNull();
  });

  it('closing does not change the month', async () => {
    await renderWithProviders(<Harness />);
    await fireEvent.press(await screen.findByRole('button', { name: /escolher mês$/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(changes).toEqual([]);
    expect(screen.queryByText('Escolher mês')).toBeNull();
  });

  it('disables the year arrows at the limits', async () => {
    await renderWithProviders(<Harness start="2100-05" />);
    await fireEvent.press(await screen.findByRole('button', { name: /escolher mês$/ }));
    expect(screen.getByRole('button', { name: 'Ano seguinte' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeEnabled();
  });
});

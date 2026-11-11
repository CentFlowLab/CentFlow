import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { CategoryPicker } from '@/features/finance/CategoryPicker';
import { renderWithProviders } from '@/test-utils/render';

const CATEGORIES = [
  { id: 'a', name: 'Supermercado', icon: 'cart-outline', color: 'green' },
  { id: 'b', name: 'Restaurantes', icon: 'restaurant-outline', color: 'orange' },
  { id: 'c', name: 'Saúde', icon: 'medkit-outline', color: 'red' },
];

function Harness({ none }: { none?: boolean }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <CategoryPicker
      label="Categoria"
      categories={CATEGORIES}
      value={value}
      onChange={setValue}
      noneLabel={none ? 'Sem categoria' : undefined}
    />
  );
}

describe('CategoryPicker', () => {
  it('opens a searchable list, ignores accents and shows the choice in the field', async () => {
    await renderWithProviders(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Escolher categoria' }));
    await fireEvent.changeText(screen.getByLabelText('Procurar'), 'saude');
    expect(screen.queryByRole('radio', { name: 'Supermercado' })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Saúde' }));
    expect(screen.getByRole('button', { name: 'Categoria: Saúde' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Saúde' }));
    await fireEvent.changeText(screen.getByLabelText('Procurar'), 'xyzzy');
    expect(screen.getByText('Nenhuma categoria com esse nome.')).toBeOnTheScreen();
  });

  it('offers "none" when the category is optional', async () => {
    await renderWithProviders(<Harness none />);
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Sem categoria' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Restaurantes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Categoria: Restaurantes' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Sem categoria' }));
    expect(screen.getByRole('button', { name: 'Categoria: Sem categoria' })).toBeOnTheScreen();
  });
});

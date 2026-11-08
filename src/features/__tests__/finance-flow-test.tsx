import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

// Valores formatados em pt-PT usam espaço não separável antes do "€".
const eur = (text: string) => new RegExp(`^[+−-]?${text.replace('.', '\\.')}\\s€$`);

async function createAccount(name: string, initialBalance: string) {
  await fireEvent.changeText(await screen.findByLabelText('Nome'), name);
  await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), initialBalance);
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
}

async function addEntry({
  type,
  amount,
  category,
  description,
}: {
  type?: 'Rendimento' | 'Transferência';
  amount: string;
  category?: string;
  description?: string;
}) {
  await fireEvent.press(await screen.findByRole('button', { name: 'Novo movimento' }));
  expect(screen).toHavePathname('/new-transaction');
  if (type) await fireEvent.press(await screen.findByRole('radio', { name: type }));
  await fireEvent.changeText(await screen.findByLabelText('Valor'), amount);
  if (category) await fireEvent.press(screen.getByRole('radio', { name: category }));
  if (description) {
    await fireEvent.press(screen.getByRole('button', { name: 'Descrição e notas' }));
    await fireEvent.changeText(screen.getByLabelText(/^Descrição/), description);
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
}

describe('local finance flow (real SQLite)', () => {
  it('creates an account, records entries and shows real totals on the dashboard', async () => {
    await renderRouter('./src/app');

    await fireEvent.press(await screen.findByRole('button', { name: 'Criar conta' }));
    expect(screen).toHavePathname('/account/new');
    await createAccount('Conta à ordem', '1000');

    expect(await screen.findByText('Saldo total')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(await screen.findByText(eur('1000,00'))).toBeOnTheScreen();

    await addEntry({ amount: '12,50', category: 'Supermercado', description: 'Mercearia' });
    expect(await screen.findByText(eur('987,50'))).toBeOnTheScreen();
    expect(await screen.findByText('Mercearia')).toBeOnTheScreen();

    await addEntry({ type: 'Rendimento', amount: '2000', category: 'Salário' });
    expect(await screen.findByText(eur('2987,50'))).toBeOnTheScreen();
    // Poupança líquida = 2000 − 12,50; taxa = 1987,5 / 2000 = 99,4 %.
    expect(await screen.findByText(eur('1987,50'))).toBeOnTheScreen();
    expect(screen.getByText(/^99,4\s?%$/)).toBeOnTheScreen();
  });

  it('edits and deletes an entry, updating the balance each time', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Carteira', '100');
    await addEntry({ amount: '10', category: 'Restaurantes', description: 'Almoço' });
    expect(await screen.findByText(eur('90,00'))).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('button', { name: /^Almoço/ }));
    await waitFor(() => expect(screen.getByLabelText('Valor').props.value).toBe('10,00'));
    await fireEvent.changeText(screen.getByLabelText('Valor'), '25');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(eur('75,00'))).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('button', { name: /^Almoço/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar movimento' }));
    expect(await screen.findByText(eur('100,00'))).toBeOnTheScreen();
    expect(screen.queryByText('Almoço')).toBeNull();
  });

  it('shows field errors instead of saving invalid entries', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco', '0');
    await fireEvent.press(await screen.findByRole('button', { name: 'Novo movimento' }));
    await fireEvent.changeText(await screen.findByLabelText('Valor'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('O valor tem de ser maior que zero.')).toBeOnTheScreen();
    expect(screen.getByText('Escolhe uma categoria.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/new-transaction');
  });

  it('transfers between accounts without changing the total', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco Principal', '500');
    await screen.findByText('Saldo total');
    await act(() => router.push('/account/new'));
    await createAccount('Mealheiro', '0');
    expect(await screen.findByText(eur('500,00'))).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole('button', { name: 'Novo movimento' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Transferência' }));
    await fireEvent.changeText(screen.getByLabelText('Valor'), '200');
    const mealheiro = screen.getAllByRole('radio', { name: 'Mealheiro' });
    await fireEvent.press(mealheiro[mealheiro.length - 1]!);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    await act(() => router.navigate('/accounts'));
    expect(await screen.findByText(eur('300,00'))).toBeOnTheScreen();
    expect(screen.getByText(eur('200,00'))).toBeOnTheScreen();
    // Total da moeda inalterado: transferências não são rendimento nem despesa.
    expect(screen.getByText(eur('500,00'))).toBeOnTheScreen();
  });

  it('searches entries by description, ignoring accents', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco', '0');
    await addEntry({ amount: '3', category: 'Restaurantes', description: 'Café' });
    await addEntry({ amount: '40', category: 'Supermercado', description: 'Compras semanais' });

    await act(() => router.navigate('/transactions'));
    expect(await screen.findByText('2 movimentos')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Pesquisar'), 'cafe');
    expect(await screen.findByText('1 movimento')).toBeOnTheScreen();
    expect(screen.getByText('Café')).toBeOnTheScreen();
    expect(screen.queryByText('Compras semanais')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Pesquisar'), 'zzz');
    expect(await screen.findByText('Nada encontrado')).toBeOnTheScreen();
  });
});

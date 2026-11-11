import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

// Fluxos completos com SQLite real: no runner macOS do CI o primeiro passa os 5 s por omissão.
jest.setTimeout(30_000);

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

/** O mesmo valor pode aparecer no saldo total e no disponível de "Este mês". */
async function expectAmount(value: string) {
  expect((await screen.findAllByText(eur(value))).length).toBeGreaterThan(0);
}

describe('local finance flow (real SQLite)', () => {
  // O onboarding tem testes próprios (app-navigation-test).
  beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

  it('creates an account, records entries and shows real totals on the dashboard', async () => {
    await renderRouter('./src/app');

    await fireEvent.press(await screen.findByRole('button', { name: 'Criar conta' }));
    expect(screen).toHavePathname('/account/new');
    await createAccount('Conta à ordem', '1000');

    expect(await screen.findByText('Saldo total')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    await expectAmount('1000,00');

    await addEntry({ amount: '12,50', category: 'Supermercado', description: 'Mercearia' });
    await expectAmount('987,50');
    expect(await screen.findByText('Mercearia')).toBeOnTheScreen();

    await addEntry({ type: 'Rendimento', amount: '2000', category: 'Salário' });
    await expectAmount('2987,50');
    // Poupança líquida = 2000 − 12,50; taxa = 1987,5 / 2000 = 99,4 %.
    expect(await screen.findByText(eur('1987,50'))).toBeOnTheScreen();
    expect(screen.getByText(/^99,4\s?%$/)).toBeOnTheScreen();
    // "Este mês" (o conteúdo da previsão depende do dia: ver core/finance/forecast-test).
    expect(screen.getByText('Previsão para o fim do mês')).toBeOnTheScreen();
    expect(screen.getByText('Podes gastar por dia')).toBeOnTheScreen();
  });

  it('edits and deletes an entry, updating the balance each time', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Carteira', '100');
    await addEntry({ amount: '10', category: 'Restaurantes', description: 'Almoço' });
    await expectAmount('90,00');

    await fireEvent.press(await screen.findByRole('button', { name: /^Almoço/ }));
    await waitFor(() => expect(screen.getByLabelText('Valor').props.value).toBe('10,00'));
    await fireEvent.changeText(screen.getByLabelText('Valor'), '25');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await expectAmount('75,00');

    await fireEvent.press(await screen.findByRole('button', { name: /^Almoço/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar movimento' }));
    await expectAmount('100,00');
    expect(screen.queryByText('Almoço')).toBeNull();
  });

  it('deletes from the swipe action with undo, then for real', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Carteira', '100');
    await addEntry({ amount: '10', category: 'Restaurantes', description: 'Almoço' });
    await act(() => router.navigate('/transactions'));

    // O gesto de deslizar expõe a mesma ação aos leitores de ecrã.
    const swipe = async () => {
      const row = await screen.findByRole('button', { name: /^Almoço/ });
      let node = row.parent;
      while (node && !node.props.accessibilityActions) node = node.parent;
      // Ações do gesto: "Editar" e "Eliminar"; escolhe-se pelo rótulo, não pela posição.
      const actions = node!.props.accessibilityActions as { name: string; label: string }[];
      const remove = actions.find((action) => action.label === 'Eliminar')!;
      await fireEvent(node!, 'accessibilityAction', { nativeEvent: { actionName: remove.name } });
    };
    await swipe();
    expect(await screen.findByText('Movimento eliminado')).toBeOnTheScreen();
    expect(screen.queryByText('Almoço')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Anular' }));
    expect(await screen.findByText('Almoço')).toBeOnTheScreen();

    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'] });
    try {
      await swipe();
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(screen.queryByText('Movimento eliminado')).toBeNull());
    await act(() => router.navigate('/'));
    await expectAmount('100,00');
  });

  it('explains that a credit card in net worth must move to accounts to take purchases', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco', '100');
    await act(() => router.push('/wealth/new'));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Cartão de crédito' }));
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Visa');
    await fireEvent.changeText(screen.getByLabelText('Valor em dívida'), '450');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar item' }));
    await act(() => router.push('/new-transaction'));
    expect(await screen.findByText(/O teu cartão de crédito está no Património/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Passar cartões para Contas' })).toBeOnTheScreen();
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

  it('imports a CSV statement after a preview that leaves likely duplicates out', async () => {
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco', '100');
    await addEntry({ amount: '3', category: 'Restaurantes', description: 'Café' });

    await act(() => router.navigate('/transactions'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Importar extrato' }));
    expect(screen).toHavePathname('/import-statement');
    await fireEvent.changeText(
      await screen.findByLabelText('Ou cola aqui o conteúdo do CSV'),
      [
        'Data;Descrição;Montante',
        `${today};CAFE CENTRAL;-3,00`,
        `${today};PINGO DOCE;-23,50`,
        `${today};REEMBOLSO;5,00`,
        'linha estragada;x;y',
      ].join('\n'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Pré-visualizar' }));

    expect(await screen.findByText('3 movimentos lidos')).toBeOnTheScreen();
    expect(screen.getByText(/1 parece já estar registado/)).toBeOnTheScreen();
    expect(screen.getByText(/Linhas ignoradas.*5/)).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: /CAFE CENTRAL/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /PINGO DOCE/ })).toBeChecked();
    // Nada foi gravado ainda.
    await fireEvent.press(screen.getByRole('button', { name: 'Importar 2 movimentos' }));

    await waitFor(() => expect(screen).toHavePathname('/transactions'));
    expect(await screen.findByText('3 movimentos')).toBeOnTheScreen();
    expect(screen.getByText('PINGO DOCE')).toBeOnTheScreen();
    expect(screen.getByText('REEMBOLSO')).toBeOnTheScreen();
    expect(screen.queryByText('CAFE CENTRAL')).toBeNull();
  });

  it('keeps type and period inside Filtros and counts the active ones', async () => {
    await renderRouter('./src/app', { initialUrl: '/account/new' });
    await createAccount('Banco', '0');
    await addEntry({ amount: '3', category: 'Restaurantes', description: 'Café' });

    await act(() => router.navigate('/transactions'));
    expect(await screen.findByText('1 movimento')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Hoje' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Rendimento' })).toBeNull();
    expect(screen.queryByText('Este mês')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Rendimento' }));
    expect(await screen.findByText('Nada encontrado')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText('1 movimento')).toBeOnTheScreen();
  });

  it('records wealth items and shows the net worth without changing account totals', async () => {
    await renderRouter('./src/app', { initialUrl: '/wealth' });
    expect(await screen.findByText('Ainda não há património')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar o primeiro item' }));
    expect(screen).toHavePathname('/wealth/new');
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Casa');
    await fireEvent.changeText(screen.getByLabelText('Valor atual'), '200000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar item' }));

    expect(await screen.findByText('Casa')).toBeOnTheScreen();
    expect(await screen.findAllByText(eur('200\\s000,00'))).not.toHaveLength(0);

    await act(() => router.navigate('/wealth/new'));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Crédito habitação' }));
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Hipoteca');
    await fireEvent.changeText(screen.getByLabelText('Valor em dívida'), '120000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar item' }));

    expect(await screen.findByText('Hipoteca')).toBeOnTheScreen();
    expect(await screen.findByText(eur('80\\s000,00'))).toBeOnTheScreen();
  });

  it('registers a vehicle and a document with their deadlines', async () => {
    await renderRouter('./src/app', { initialUrl: '/vehicles' });
    expect(await screen.findByText('Ainda não há veículos')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar o primeiro veículo' }));
    expect(screen).toHavePathname('/vehicles/new');
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Carrinha');
    await fireEvent.press(screen.getByRole('radio', { name: 'Carrinha' }));
    await fireEvent.changeText(screen.getByLabelText('Quilómetros (opcional)'), '120000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar veículo' }));
    expect(await screen.findByText('Carrinha')).toBeOnTheScreen();

    await act(() => router.navigate('/documents'));
    expect(await screen.findByText('Ainda não há documentos')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar o primeiro documento' }));
    await fireEvent.changeText(await screen.findByLabelText('Título'), 'Seguro auto');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar documento' }));
    expect(await screen.findByText('Seguro auto')).toBeOnTheScreen();
    expect(screen.getByText(/Sem validade/)).toBeOnTheScreen();
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.setTimeout(60_000);

beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

async function createAccount() {
  await act(() => router.navigate('/account/new'));
  await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Banco');
  await fireEvent.changeText(screen.getByLabelText('Saldo inicial'), '500');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText('Saldo total');
}

async function addCoffee(amount: string) {
  await act(() => router.navigate('/new-transaction'));
  await fireEvent.changeText(await screen.findByLabelText('Valor'), amount);
  await fireEvent.press(screen.getByRole('button', { name: /^Categoria:/ }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Restaurantes' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Descrição e notas' }));
  await fireEvent.changeText(screen.getByLabelText(/^Descrição/), 'Café');
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
}

describe('quick entry', () => {
  it('offers a frequent entry, suggests its category and warns about a repeat', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await createAccount();
    await addCoffee('1,20');
    await addCoffee('1,30');

    // Atalho "Café": preenche descrição e categoria; só falta o valor.
    await act(() => router.navigate('/new-transaction'));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Café' }));
    expect(screen.getByRole('button', { name: 'Categoria: Restaurantes' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Valor'), '1,30');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    // Igual ao de antes no mesmo dia e conta: pede confirmação antes de gravar.
    expect(await screen.findByText('Parece repetido')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Valor')).toBeOnTheScreen();
  });

  it('records a subscription payment as a real expense and moves the next charge', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });
    await createAccount();
    await act(() => router.navigate('/subscription/new'));
    await fireEvent.changeText(await screen.findByLabelText('Nome'), 'Música');
    await fireEvent.changeText(screen.getByLabelText('Valor'), '9,99');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar subscrição' }));
    await fireEvent.press(await screen.findByRole('button', { name: /^Música/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Registar pagamento' }));

    // O formulário vem preenchido; gravar cria a despesa real.
    expect(await screen.findByDisplayValue('Música')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor').props.value).toBe('9,99');
    // A subscrição não tinha categoria: a despesa pede uma (nada é inventado).
    await fireEvent.press(screen.getByRole('button', { name: /^Categoria:/ }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Lazer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await act(() => router.navigate('/transactions'));
    expect(await screen.findByText('Música')).toBeOnTheScreen();
  });
});

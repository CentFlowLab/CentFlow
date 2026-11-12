import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { NAV_ITEMS } from '../nav-items';

// Estes testes são de navegação: o onboarding da primeira utilização tem os seus próprios testes.
const markOnboardingSeen = () => AsyncStorage.setItem('centflow:onboarding:seen', '1');

describe('app routes', () => {
  beforeEach(markOnboardingSeen);

  it.each(NAV_ITEMS.map((item) => [item.href]))('%s resolves to a real screen', async (href) => {
    await renderRouter('./src/app', { initialUrl: href });
    expect(screen).toHavePathname(href);
    expect(screen.queryByText('Página não encontrada')).toBeNull();
  });
});

describe('first-run onboarding', () => {
  beforeEach(() => AsyncStorage.removeItem('centflow:onboarding:seen'));

  it('opens once without accounts and can be skipped', async () => {
    await renderRouter('./src/app');
    expect(await screen.findByText('O teu dinheiro, finalmente claro.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/onboarding');
    await fireEvent.press(screen.getByRole('button', { name: 'Saltar' }));
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('centflow:onboarding:seen')).toBe('1');
  });

  it('creates the main account with the balance of today and offers the first entry', async () => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByRole('button', { name: 'Começar' }));
    expect(screen.getByLabelText('Nome').props.value).toBe('Conta à ordem');
    await fireEvent.changeText(screen.getByLabelText('Saldo atual'), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Indica um valor, por exemplo 1250,50.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Saldo atual'), '1250,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Está pronto')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Registar a primeira despesa' }));
    expect(screen).toHavePathname('/new-transaction');
    expect(await screen.findByText('Conta à ordem')).toBeOnTheScreen();
  });
});

describe('app navigation (phone layout)', () => {
  beforeEach(markOnboardingSeen);

  it('opens on the dashboard and asks for a first account (no fake data)', async () => {
    await renderRouter('./src/app');
    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Começa pela tua primeira conta')).toBeOnTheScreen();
    expect(screen.queryByText('Disponível nas contas')).toBeNull();
  });

  it('reaches secondary areas through "Mais"', async () => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByRole('tab', { name: 'Mais' }));
    expect(screen).toHavePathname('/more');

    await fireEvent.press(await screen.findByRole('button', { name: /^Veículos/ }));
    expect(screen).toHavePathname('/vehicles');
    expect(await screen.findByText('Ainda não há veículos')).toBeOnTheScreen();
  });

  it('opens quick entry from the centre button', async () => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByRole('button', { name: 'Novo movimento' }));
    expect(screen).toHavePathname('/new-transaction');
  });

  it('shows a not-found screen for unknown URLs', async () => {
    await renderRouter('./src/app', { initialUrl: '/does-not-exist' });
    expect(await screen.findByText('Página não encontrada')).toBeOnTheScreen();
  });
});

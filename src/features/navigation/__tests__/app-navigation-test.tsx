import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { NAV_ITEMS } from '../nav-items';

describe('app routes', () => {
  it.each(NAV_ITEMS.map((item) => [item.href]))('%s resolves to a real screen', async (href) => {
    await renderRouter('./src/app', { initialUrl: href });
    expect(screen).toHavePathname(href);
    expect(screen.queryByText('Página não encontrada')).toBeNull();
  });
});

describe('app navigation (phone layout)', () => {
  it('opens on the dashboard with an honest empty state', async () => {
    await renderRouter('./src/app');
    expect(screen).toHavePathname('/');
    expect(await screen.findByText('O teu painel está pronto')).toBeOnTheScreen();
  });

  it('reaches secondary areas through "Mais"', async () => {
    await renderRouter('./src/app');
    await fireEvent.press(await screen.findByRole('tab', { name: 'Mais' }));
    expect(screen).toHavePathname('/more');

    await fireEvent.press(await screen.findByRole('button', { name: /^Veículos/ }));
    expect(screen).toHavePathname('/vehicles');
    expect(await screen.findByText('Em breve')).toBeOnTheScreen();
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

import { act, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { renderWithProviders } from '@/test-utils/render';

import { Screen } from '../components/Screen';
import { useScreenScroll, type ScreenScroll } from '../layout/screenScroll';

const captured: { current: ScreenScroll | null } = { current: null };
function Probe() {
  const scroll = useScreenScroll();
  useEffect(() => {
    captured.current = scroll;
  });
  return <Text>conteúdo</Text>;
}

describe('Screen scroll context', () => {
  it('locks and unlocks the page scroll', async () => {
    await renderWithProviders(
      <Screen title="Teste">
        <Probe />
      </Screen>,
    );
    // O ScrollView do ecrã: o primeiro antecessor do conteúdo com `scrollEnabled`.
    const view = () => {
      let node = screen.getByText('conteúdo').parent;
      while (node && node.props.scrollEnabled === undefined) node = node.parent;
      if (!node) throw new Error('ScrollView not found');
      return node;
    };
    expect(await screen.findByText('conteúdo')).toBeOnTheScreen();
    expect(view().props.scrollEnabled).toBe(true);
    await act(async () => captured.current?.setScrollLocked(true));
    expect(view().props.scrollEnabled).toBe(false);
    await act(async () => captured.current?.setScrollLocked(false));
    expect(view().props.scrollEnabled).toBe(true);
  });
});

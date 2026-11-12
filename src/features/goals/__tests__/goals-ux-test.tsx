import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

jest.setTimeout(60_000);

beforeEach(() => AsyncStorage.setItem('centflow:onboarding:seen', '1'));

async function createGoal(name: string, target: string) {
  await act(() => router.navigate('/goal/new'));
  await fireEvent.changeText(await screen.findByLabelText('Nome'), name);
  await fireEvent.changeText(screen.getByLabelText('Alvo'), target);
  // A descrição é opcional: fica vazia.
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar objetivo' }));
}

describe('goals UX', () => {
  it('saves and edits a goal without a description', async () => {
    await renderRouter('./src/app', { initialUrl: '/goals' });
    await createGoal('Férias', '1000');
    expect(await screen.findByRole('button', { name: /^Férias/ })).toBeOnTheScreen();

    // Editar (pela ação da lista) e voltar a gravar continua sem descrição.
    await fireEvent.press(screen.getByRole('button', { name: /^Férias/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Alterar meta e data' }));
    await fireEvent.changeText(await screen.findByLabelText('Alvo'), '1200');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar objetivo' }));
    expect((await screen.findAllByText(/1200,00\s?€/)).length).toBeGreaterThan(0);
  });

  it('deletes from the list action only after confirming', async () => {
    await renderRouter('./src/app', { initialUrl: '/goals' });
    await createGoal('Carro', '5000');
    const card = await screen.findByRole('button', { name: /^Carro/ });
    let node = card.parent;
    while (node && !node.props.accessibilityActions) node = node.parent;
    const actions = node!.props.accessibilityActions as { name: string; label: string }[];
    const remove = actions.find((action) => action.label === 'Eliminar objetivo')!;
    await fireEvent(node!, 'accessibilityAction', { nativeEvent: { actionName: remove.name } });

    // Ainda lá: pede confirmação primeiro.
    expect(await screen.findByText('Eliminar este objetivo?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: /^Carro/ })).toBeOnTheScreen();

    await fireEvent(node!, 'accessibilityAction', { nativeEvent: { actionName: remove.name } });
    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar objetivo' }));
    expect(await screen.findByText('Ainda não há objetivos')).toBeOnTheScreen();
  });
});

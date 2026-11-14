import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import { Keyboard, Platform, type View } from 'react-native';

/** Referência a uma `View` (para medir a posição dentro do formulário). */
export type ViewHandle = ComponentRef<typeof View>;

/**
 * Ligação entre o `FormScreen` e os campos lá dentro (ADR-080):
 * - `accessoryId`: a barra nativa do iPhone (Concluído + ação principal) que os campos usam em
 *   vez da barra "Done" do sistema;
 * - `scrollIntoView`: rola o formulário até um elemento (ex.: o painel da data);
 * - `onFieldFocus`/`addFocusListener`: um campo focado avisa quem precisa (ex.: fechar o
 *   calendário aberto, para não ficar escondido atrás do teclado de outro campo).
 */
export type FormKeyboard = {
  accessoryId: string | null;
  scrollIntoView: (target: RefObject<ViewHandle | null>) => void;
  onFieldFocus: () => void;
  addFocusListener: (listener: () => void) => () => void;
};

export const FormKeyboardContext = createContext<FormKeyboard | null>(null);

export function useFormKeyboard(): FormKeyboard | null {
  return useContext(FormKeyboardContext);
}

/**
 * Teclado aberto: no iPhone pelos eventos "will" (antes da animação), no Android pelos "did"
 * (únicos disponíveis); na web nunca (o teclado do browser não muda o layout da página).
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return visible;
}

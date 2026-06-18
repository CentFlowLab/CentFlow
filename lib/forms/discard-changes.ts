import { Alert } from 'react-native';

/** Confirmação única ao fechar formulário com alterações (X, Cancelar, botão voltar). */
export function confirmDiscardChanges(onDiscard: () => void): void {
  Alert.alert('Descartar alterações?', 'Tens informação por guardar.', [
    { text: 'Continuar a editar', style: 'cancel' },
    { text: 'Descartar', style: 'destructive', onPress: onDiscard },
  ]);
}

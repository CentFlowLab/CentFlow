/**
 * Háptica — wrapper OTA-safe.
 *
 * Hoje é no-op porque `expo-haptics` é um módulo NATIVO e não está incluído no
 * IPA atual (o fluxo principal é OTA). Quando for gerado um novo IPA com
 * `expo-haptics`, basta substituir o corpo destas funções por chamadas reais:
 *
 *   import * as Haptics from 'expo-haptics';
 *   selection: () => Haptics.selectionAsync()
 *   impact: (s) => Haptics.impactAsync(map[s])
 *   notify: (t) => Haptics.notificationAsync(map[t])
 *
 * Manter a mesma assinatura para não tocar nos ecrãs.
 */

export type ImpactStrength = 'light' | 'medium' | 'heavy';
export type NotifyType = 'success' | 'warning' | 'error';

export const haptics = {
  selection(): void {},
  impact(_strength: ImpactStrength = 'light'): void {},
  notify(_type: NotifyType = 'success'): void {},
};

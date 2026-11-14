import * as Haptics from 'expo-haptics';

/**
 * Vibração subtil (ADR-073), só no iPhone e no Android. Chamadas sem esperar pelo resultado:
 * nunca lançam erros nem registam dados do utilizador. A web e o Windows usam `haptics.web.ts`.
 */
const run = (action: () => Promise<void>) => {
  try {
    void action().catch(() => undefined);
  } catch {
    // Sem motor de vibração (simulador, aparelho antigo): ignora.
  }
};

export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  impactLight: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  impactMedium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticsApi = typeof haptics;

/** Há vibração nesta plataforma (para mostrar a preferência). */
export const hapticsAvailable = true;

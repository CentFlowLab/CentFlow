import { Platform, Vibration } from 'react-native';

/** Feedback háptico discreto quando um gesto é bloqueado (ex.: swipe com dados por guardar). */
export function lightImpact(): void {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(12);
      return;
    }

    // iOS: vibração curta nativa (pattern ignorado — usa duração mínima)
    Vibration.vibrate(1);
  } catch {
    // Sem hápticos neste dispositivo
  }
}

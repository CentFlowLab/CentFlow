import { Platform, type ViewStyle } from 'react-native';

/**
 * Gradiente linear para fundos. No nativo usa `experimental_backgroundImage` (React Native 0.81+);
 * na web usa `backgroundImage` (CSS). A cor inicial fica como fundo de reserva.
 */
export function linearGradient(angleDegrees: number, from: string, to: string): ViewStyle {
  const value = `linear-gradient(${angleDegrees}deg, ${from}, ${to})`;
  const image =
    Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value };
  return { backgroundColor: from, ...image } as unknown as ViewStyle;
}

/** Função pura — testável em Node sem react-native. */
export function isAppleSignInSupportedOnPlatform(os: string): boolean {
  return os === 'ios';
}

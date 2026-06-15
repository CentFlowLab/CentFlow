import { NavigationBar } from 'expo-navigation-bar';
import { Platform } from 'react-native';

/** Mantém a barra de navegação Android escura e alinhada ao tema da app. */
export function AndroidNavigationBarEffect() {
  if (Platform.OS !== 'android') return null;

  return <NavigationBar style="dark" hidden={false} />;
}

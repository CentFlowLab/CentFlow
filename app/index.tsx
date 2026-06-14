import { Redirect, type Href } from 'expo-router';

import { AuthLoadingScreen } from '@/components/auth';
import { useAuth } from '@/lib/auth';

/**
 * Entrada da app — evita cair em rotas erradas (ex.: auth/callback) ao abrir.
 */
export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href={'/(tabs)/' as Href} />;
  }

  return <Redirect href={'/(auth)/login' as Href} />;
}

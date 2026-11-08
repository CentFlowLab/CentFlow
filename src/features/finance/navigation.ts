import { router, type Href } from 'expo-router';

/** Fecha um ecrã modal; se foi aberto diretamente por URL (web), vai para `fallback`. */
export function closeModal(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

import { Platform } from 'react-native';

/** A app web publicada. É este endereço que se abre no Safari. */
export const APP_WEB_URL = 'https://miven.pt/app/';

const RELOAD_PARAM = 'storage';

export type IsolationEnv = {
  web: boolean;
  isolated: boolean;
  /** O export publicado injeta o service worker que ativa o armazenamento. */
  coiScript: boolean;
  serviceWorker: boolean;
  controller: boolean;
  reloads: number;
};

/**
 * `reload`: o service worker ainda pode passar a controlar a página.
 * `explain`: este browser não vai conseguir guardar os dados; há que abrir outro.
 * `ignore`: não é o caso da web, ou o armazenamento já está disponível.
 */
export function isolationFailure(env: IsolationEnv): 'ignore' | 'reload' | 'explain' {
  if (!env.web || env.isolated) return 'ignore';
  if (!env.coiScript || !env.serviceWorker || env.controller || env.reloads >= 1) return 'explain';
  return 'reload';
}

export function readIsolationEnv(): IsolationEnv {
  if (Platform.OS !== 'web') {
    return {
      web: false,
      isolated: false,
      coiScript: false,
      serviceWorker: false,
      controller: false,
      reloads: 0,
    };
  }
  let reloads = 1;
  try {
    reloads = new URL(window.location.href).searchParams.get(RELOAD_PARAM) === '1' ? 1 : 0;
  } catch {
    // Sem URL não dá para evitar um ciclo de recarregamentos.
    reloads = 1;
  }
  const worker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
  return {
    web: true,
    isolated: globalThis.crossOriginIsolated === true,
    coiScript: document.querySelector('script[src*="coi-serviceworker"]') !== null,
    serviceWorker: worker !== undefined,
    controller: Boolean(worker?.controller),
    reloads,
  };
}

/** Recarrega uma vez, deixando na URL a marca de que a tentativa já foi feita. */
export function reloadForIsolation(): void {
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_PARAM, '1');
  window.location.replace(url.toString());
}

export async function copyAppAddress(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(APP_WEB_URL);
    return true;
  } catch {
    return false;
  }
}

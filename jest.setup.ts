import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Locale determinístico: os testes não dependem do idioma da máquina.
jest.mock('expo-localization', () => {
  const locales = [{ languageTag: 'pt-PT', languageCode: 'pt', regionCode: 'PT' }];
  return { getLocales: () => locales, useLocales: () => locales };
});

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-network', () => ({
  addNetworkStateListener: () => ({ remove: jest.fn() }),
}));

jest.mock('expo-linking', () => {
  const actual = jest.requireActual<typeof import('expo-linking')>('expo-linking');
  return {
    ...actual,
    createURL: (path: string) => `centflow://${String(path).replace(/^\//, '')}`,
  };
});

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// Sem cliente real: os testes não falam com o projeto alojado.
jest.mock('@/lib/supabase', () => ({
  getSupabase: jest.fn(() => null),
}));

// A app abre uma base de dados SQLite real (node:sqlite, em memória) e nova em cada montagem.
jest.mock('@/data/open-app-database', () => {
  const { openTestStore } = jest.requireActual('@/test-utils/node-sqlite-driver');
  return {
    openLocalSpace: jest.fn(async () => openTestStore()),
    closeLocalSpace: jest.fn(async () => undefined),
    deleteLocalSpace: jest.fn(async () => undefined),
  };
});

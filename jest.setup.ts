import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Locale determinístico: os testes não dependem do idioma da máquina.
jest.mock('expo-localization', () => {
  const locales = [{ languageTag: 'pt-PT', languageCode: 'pt', regionCode: 'PT' }];
  return { getLocales: () => locales, useLocales: () => locales };
});

// A app abre uma base de dados SQLite real (node:sqlite, em memória) e nova em cada montagem.
jest.mock('@/data/open-app-database', () => {
  const { openTestRepositories } = jest.requireActual('@/test-utils/node-sqlite-driver');
  return {
    DATABASE_NAME: 'centflow-test.db',
    openAppRepositories: jest.fn(async () => (await openTestRepositories()).repos),
  };
});

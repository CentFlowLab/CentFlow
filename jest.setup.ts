import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Locale determinístico: os testes não dependem do idioma da máquina.
jest.mock('expo-localization', () => {
  const locales = [{ languageTag: 'pt-PT', languageCode: 'pt', regionCode: 'PT' }];
  return { getLocales: () => locales, useLocales: () => locales };
});

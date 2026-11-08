import '@/i18n';

import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/account/AuthProvider';
import {
  createPreferencesRepository,
  PreferencesProvider,
  type Preferences,
} from '@/features/preferences';
import { createMemoryStore } from '@/lib/storage/key-value-store';
import { ThemeProvider } from '@/ui/theme';

const TEST_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

type Options = {
  preferences?: Partial<Preferences>;
};

/** Renderiza com os providers reais da app e armazenamento em memória. */
export async function renderWithProviders(ui: ReactElement, { preferences }: Options = {}) {
  const store = createMemoryStore();
  const repository = createPreferencesRepository(store);
  await repository.save({ theme: 'light', language: 'pt-PT', ...preferences });

  const result = await render(
    <SafeAreaProvider initialMetrics={TEST_METRICS}>
      <PreferencesProvider repository={repository}>
        <ThemeProvider preference={preferences?.theme ?? 'light'}>
          <AuthProvider>{ui}</AuthProvider>
        </ThemeProvider>
      </PreferencesProvider>
    </SafeAreaProvider>,
  );
  return { ...result, repository };
}

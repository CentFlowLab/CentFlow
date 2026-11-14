import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMemoryStore } from '@/lib/storage/key-value-store';

import { createPreferencesRepository, DEFAULT_PREFERENCES } from '../preferences';
import { PreferencesProvider } from '../PreferencesProvider';
import { useHaptics } from '../useHaptics';

const mockSuccess = jest.fn();
jest.mock('@/lib/haptics', () => ({
  hapticsAvailable: true,
  haptics: {
    selection: jest.fn(),
    impactLight: jest.fn(),
    impactMedium: jest.fn(),
    success: () => mockSuccess(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

async function hookWith(haptics: boolean) {
  const repository = createPreferencesRepository(createMemoryStore());
  await repository.save({ ...DEFAULT_PREFERENCES, language: 'pt-PT', haptics });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PreferencesProvider repository={repository}>{children}</PreferencesProvider>
  );
  return renderHook(() => useHaptics(), { wrapper });
}

beforeEach(() => mockSuccess.mockClear());

describe('useHaptics', () => {
  it('vibrates when the preference is on', async () => {
    const { result } = await hookWith(true);
    result.current.success();
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the preference is off', async () => {
    const { result } = await hookWith(false);
    result.current.success();
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});

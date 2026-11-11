import { isAppleSignInAvailable } from '../apple-sign-in';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
}));

const original = process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED;
  else process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED = original;
});

describe('isAppleSignInAvailable', () => {
  it('hides Apple on iPhone while the provider is off, even if the system supports it', async () => {
    delete process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED;
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
  });

  it('shows Apple on iPhone once the provider is on', async () => {
    process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED = 'true';
    await expect(isAppleSignInAvailable()).resolves.toBe(true);
  });
});

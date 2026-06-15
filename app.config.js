/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

/** Valores Beta — URL e anon key são públicos (client-side). */
const BETA_SUPABASE = {
  url: 'https://oxhjfwmhcwadlltinlck.supabase.co',
  anonKey: 'sb_publishable_nY3Bqe4UcgbtIteavz6H1Q_kgquHcDQ',
};

function resolveVariant() {
  const explicit = process.env.EXPO_PUBLIC_APP_VARIANT?.trim();
  if (explicit === 'development' || explicit === 'beta' || explicit === 'production') {
    return explicit;
  }

  const profile = process.env.EAS_BUILD_PROFILE?.trim();
  if (profile === 'beta' || profile === 'preview' || profile === 'preview-real') {
    return 'beta';
  }

  const updateChannel =
    process.env.EXPO_PUBLIC_EAS_UPDATE_CHANNEL?.trim() ||
    process.env.EAS_UPDATE_CHANNEL?.trim();
  if (updateChannel === 'preview') {
    return 'beta';
  }

  return process.env.NODE_ENV === 'development' ? 'development' : 'production';
}

const variant = resolveVariant();
const isBeta = variant === 'beta';
const isProduction = variant === 'production';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  (isBeta ? BETA_SUPABASE.url : '');
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  (isBeta ? BETA_SUPABASE.anonKey : '');

const mockAuth =
  process.env.EXPO_PUBLIC_MOCK_AUTH?.trim() ||
  (isBeta || isProduction ? 'false' : '');

module.exports = {
  expo: {
    ...appJson.expo,
    name: isBeta ? 'CentFlow Beta' : appJson.expo.name,
    extra: {
      ...appJson.expo.extra,
      appVariant: variant,
      supabaseUrl,
      supabaseAnonKey,
      mockAuth,
    },
  },
};

/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

/** Supabase CentFlow — URL e anon key públicos (client-side). */
const CENTFLOW_SUPABASE = {
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
const isRealData = isBeta || isProduction;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  (isRealData ? CENTFLOW_SUPABASE.url : '');
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  (isRealData ? CENTFLOW_SUPABASE.anonKey : '');

const mockAuth =
  process.env.EXPO_PUBLIC_MOCK_AUTH?.trim() ||
  (isBeta || isProduction ? 'false' : '');

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';

const updateChannel =
  process.env.EAS_UPDATE_CHANNEL?.trim() ||
  process.env.EXPO_PUBLIC_EAS_UPDATE_CHANNEL?.trim() ||
  (isBeta ? 'preview' : isProduction ? 'production' : 'development');

module.exports = {
  expo: {
    ...appJson.expo,
    name: isBeta ? 'CentFlow Beta' : appJson.expo.name,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      '@react-native-community/datetimepicker',
      ...(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
        ? [
            [
              '@sentry/react-native/expo',
              {
                organization: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
              },
            ],
          ]
        : []),
    ],
    updates: {
      ...appJson.expo.updates,
      channel: updateChannel,
      requestHeaders: {
        'expo-channel-name': updateChannel,
      },
    },
    extra: {
      ...appJson.expo.extra,
      appVariant: variant,
      supabaseUrl,
      supabaseAnonKey,
      mockAuth,
      sentryDsn,
    },
  },
};

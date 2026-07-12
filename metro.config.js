const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Sentry metro wrapper só quando org/project estão definidos (EAS Build com source maps).
if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  const { withSentryConfig } = require('@sentry/react-native/metro');
  module.exports = withSentryConfig(config);
} else {
  module.exports = config;
}

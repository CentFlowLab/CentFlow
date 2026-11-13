// Config plugin: APK Android sem R8 (ADR-070). O modelo do Expo SDK 58 liga
// `android.enableMinifyInReleaseBuilds`, e o R8 removia o construtor de
// `androidx.work.impl.WorkDatabase_Impl` (WorkManager, que arranca com a app pelo
// androidx.startup): a 0.1.19 fechava logo ao abrir, antes do JavaScript e do Sentry.
const { withGradleProperties } = require('expo/config-plugins');

const OFF = {
  'android.enableMinifyInReleaseBuilds': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'false',
};

function withAndroidNoMinify(config) {
  return withGradleProperties(config, (modConfig) => {
    for (const [key, value] of Object.entries(OFF)) {
      const existing = modConfig.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) existing.value = value;
      else modConfig.modResults.push({ type: 'property', key, value });
    }
    return modConfig;
  });
}

module.exports = withAndroidNoMinify;

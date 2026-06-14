/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const variant = process.env.EXPO_PUBLIC_APP_VARIANT ?? (__DEV__ ? 'development' : 'production');
const isBeta = variant === 'beta';

module.exports = {
  expo: {
    ...appJson.expo,
    name: isBeta ? 'CentFlow Beta' : appJson.expo.name,
    extra: {
      ...appJson.expo.extra,
      appVariant: variant,
    },
  },
};

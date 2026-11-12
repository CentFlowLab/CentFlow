// https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// O SQLite da web (sql.js) é carregado como WebAssembly.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// A web usa o sql.js (ADR-060), que não precisa de isolamento cross-origin (COOP/COEP).

module.exports = config;

// https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup
const { ServerResponse } = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite na web carrega o SQLite como WebAssembly.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// SharedArrayBuffer (usado pelo worker do expo-sqlite) exige isolamento cross-origin, e os
// cabeçalhos têm de chegar ao documento HTML. A Expo CLI serve o HTML num middleware anterior ao
// do Metro, fora do alcance de `enhanceMiddleware`, por isso aplicam-se a todas as respostas do
// servidor de desenvolvimento. Em produção, o alojamento envia-os (ver public/_headers).
const ISOLATION_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
let isolationHeadersInstalled = false;

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  if (!isolationHeadersInstalled) {
    isolationHeadersInstalled = true;
    const writeHead = ServerResponse.prototype.writeHead;
    ServerResponse.prototype.writeHead = function writeHeadWithIsolation(...args) {
      if (!this.headersSent) {
        for (const [name, value] of Object.entries(ISOLATION_HEADERS)) {
          if (!this.hasHeader(name)) this.setHeader(name, value);
        }
      }
      return writeHead.apply(this, args);
    };
  }
  return enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
};

module.exports = config;

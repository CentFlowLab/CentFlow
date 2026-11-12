// Variantes da app (docs/ambientes.md). Sem APP_VARIANT, é a app publicada (app.json tal como está).
// APP_VARIANT=preview gera "Miven Teste": outro identificador e outro esquema de links, para se
// instalar ao lado da app real sem a substituir nem partilhar dados, e apontar para o staging.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'preview') return config;
  return {
    ...config,
    name: 'Miven Teste',
    scheme: 'miven-preview',
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.preview` },
    android: { ...config.android, package: `${config.android.package}.preview` },
  };
};

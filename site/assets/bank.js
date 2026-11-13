// Regresso da autorização no banco (open banking, ADR-069). Não guarda nada: passa o código e o
// `state` à app (miven://bank-callback) ou à app web (/app/bank-callback), que os confirmam no
// servidor. O sufixo do `state` (.w ou .m) diz onde a ligação começou.
(function () {
  let TEXT = {
    pt: {
      ok: ['A voltar ao Miven', 'A ligação ao banco está quase concluída.'],
      error: ['A autorização não foi concluída', 'Volta ao Miven e tenta ligar o banco de novo.'],
      open: 'Abrir a app Miven',
      web: 'Continuar no browser',
    },
    en: {
      ok: ['Going back to Miven', 'The bank connection is almost done.'],
      error: [
        'The authorisation was not completed',
        'Go back to Miven and try connecting the bank again.',
      ],
      open: 'Open the Miven app',
      web: 'Continue in the browser',
    },
    es: {
      ok: ['Volviendo a Miven', 'La conexión con el banco está casi lista.'],
      error: [
        'La autorización no se completó',
        'Vuelve a Miven e intenta conectar el banco de nuevo.',
      ],
      open: 'Abrir la app Miven',
      web: 'Continuar en el navegador',
    },
  };
  let lang = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  let t = TEXT[lang] || TEXT.pt;
  document.documentElement.lang = TEXT[lang] ? lang : 'pt-PT';

  let query = new URLSearchParams(window.location.search);
  let forward = new URLSearchParams();
  ['code', 'state', 'error'].forEach(function (key) {
    let value = query.get(key);
    if (value && value.length <= 2000) forward.set(key, value);
  });
  let failed = !forward.has('code');
  if (failed && !forward.has('error')) forward.set('error', 'cancelled');
  // O código não fica no histórico do browser.
  window.history.replaceState(null, '', window.location.pathname);

  let content = failed ? t.error : t.ok;
  document.getElementById('title').textContent = content[0];
  document.getElementById('message').textContent = content[1];
  let icon = document.getElementById('icon');
  icon.textContent = failed ? '!' : '→';
  if (failed) icon.classList.add('error');

  let web = /\.w$/.test(forward.get('state') || '');
  let target = web
    ? 'https://miven.pt/app/bank-callback?' + forward.toString()
    : 'miven://bank-callback?' + forward.toString();
  let button = document.getElementById('open');
  button.textContent = web ? t.web : t.open;
  button.setAttribute('href', target);
  if (web) window.location.replace(target);
  else
    window.setTimeout(function () {
      window.location.href = target;
    }, 300);
})();

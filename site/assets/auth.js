// Páginas de retorno dos emails do Miven (ADR-034). Não guardam nem enviam nada.
// O código PKCE segue para a app (miven://). O token_hash abre a app web, que confirma em qualquer dispositivo.
(function () {
  let TEXT = {
    pt: {
      callbackOk: ['Email confirmado', 'A tua conta Miven está ativa. Volta à app para entrar.'],
      resetOk: [
        'Repor palavra-passe',
        'Abre este link no telemóvel onde pediste a reposição para escolheres a nova palavra-passe.',
      ],
      error: [
        'O link já não é válido',
        'Os links expiram ao fim de algum tempo ou depois de usados. Pede um novo na app.',
      ],
      open: 'Abrir a app Miven',
      hint: 'Se a app não abrir, abre o Miven no telemóvel e entra com o teu email e palavra-passe.',
      confirm: ['A abrir a conta', 'Estamos a confirmar o email e a abrir o Miven.'],
      continueWeb: 'Continuar no browser',
    },
    en: {
      callbackOk: [
        'Email confirmed',
        'Your Miven account is active. Go back to the app to sign in.',
      ],
      resetOk: [
        'Reset your password',
        'Open this link on the phone where you asked for the reset to choose a new password.',
      ],
      error: [
        'This link is no longer valid',
        'Links expire after a while or once used. Request a new one in the app.',
      ],
      open: 'Open the Miven app',
      hint: "If the app doesn't open, open Miven on your phone and sign in with your email and password.",
      confirm: ['Opening your account', 'Confirming your email and opening Miven.'],
      continueWeb: 'Continue in the browser',
    },
    es: {
      callbackOk: [
        'Email confirmado',
        'Tu cuenta de Miven está activa. Vuelve a la app para entrar.',
      ],
      resetOk: [
        'Restablecer contraseña',
        'Abre este enlace en el móvil donde pediste el cambio para elegir una nueva contraseña.',
      ],
      error: [
        'El enlace ya no es válido',
        'Los enlaces caducan pasado un tiempo o tras usarse. Pide uno nuevo en la app.',
      ],
      open: 'Abrir la app Miven',
      hint: 'Si la app no se abre, abre Miven en el móvil y entra con tu email y contraseña.',
      confirm: ['Abriendo la cuenta', 'Estamos confirmando el correo y abriendo Miven.'],
      continueWeb: 'Continuar en el browser',
    },
  };

  let lang = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  let t = TEXT[lang] || TEXT.pt;
  document.documentElement.lang = TEXT[lang] ? lang : 'pt-PT';

  let page = document.body.getAttribute('data-page');
  let query = new URLSearchParams(window.location.search);
  let hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  let failed = query.has('error') || query.has('error_code') || hash.has('error');
  let tokenHash = query.get('token_hash') || hash.get('token_hash');
  let content = failed
    ? t.error
    : page === 'reset'
      ? t.resetOk
      : tokenHash
        ? t.confirm
        : t.callbackOk;

  document.getElementById('title').textContent = content[0];
  document.getElementById('message').textContent = content[1];
  document.getElementById('hint').textContent = tokenHash && !failed ? '' : t.hint;
  let icon = document.getElementById('icon');
  icon.textContent = failed ? '!' : tokenHash ? '→' : '✓';
  if (failed) icon.classList.add('error');

  // O código PKCE só cria sessão no dispositivo que o pediu. O token_hash confirma em qualquer um
  // e a app web é que o troca: a app já instalada ainda não o conhece.
  let forward = new URLSearchParams();
  ['code', 'error', 'error_code', 'error_description', 'token_hash', 'type'].forEach(
    function (key) {
      let value = query.get(key) || hash.get(key);
      if (value) forward.set(key, value);
    },
  );
  let path = page === 'reset' ? 'reset-password' : 'callback';
  let deepLink = 'miven://auth/' + path + (forward.toString() ? '?' + forward.toString() : '');
  let webTarget =
    'https://miven.pt/app/auth/' + path + (forward.toString() ? '?' + forward.toString() : '');
  let button = document.getElementById('open');
  if (tokenHash && !failed) {
    button.textContent = t.continueWeb;
    button.setAttribute('href', webTarget);
    window.location.replace(webTarget);
  } else {
    button.textContent = t.open;
    button.setAttribute('href', deepLink);
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && forward.has('code')) {
      window.setTimeout(function () {
        window.location.href = deepLink;
      }, 400);
    }
  }
})();

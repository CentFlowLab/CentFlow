// Páginas de retorno dos emails do Miven (ADR-034). Não guardam nada.
// Confirmação de conta: esta página confirma o email no Supabase e abre a app (miven://), que entra
// sozinha. O link só é usado aqui, com JavaScript, para os antivírus do email não o gastarem.
(function () {
  let TEXT = {
    pt: {
      callbackOk: [
        'Email confirmado',
        'A tua conta Miven está ativa. Volta à app: entras automaticamente.',
      ],
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
      confirm: ['A confirmar o email', 'Só um momento.'],
      continueWeb: 'Continuar no browser',
    },
    en: {
      callbackOk: [
        'Email confirmed',
        'Your Miven account is active. Go back to the app: you will be signed in automatically.',
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
      confirm: ['Confirming your email', 'Just a moment.'],
      continueWeb: 'Continue in the browser',
    },
    es: {
      callbackOk: [
        'Email confirmado',
        'Tu cuenta de Miven está activa. Vuelve a la app: entrarás automáticamente.',
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
      confirm: ['Confirmando el correo', 'Un momento.'],
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
  // O regresso do Supabase pode trazer a sessão no fragmento: não fica no endereço nem segue.
  if (hash.has('access_token') || hash.has('refresh_token')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  // Endereço público do Supabase, escrito pelo workflow "Site miven.pt" (assets/auth-config.js).
  let supabaseUrl = (window.MIVEN_AUTH && window.MIVEN_AUTH.supabaseUrl) || '';
  let verifyHere =
    page === 'callback' && !!tokenHash && !failed && /^https:\/\/[a-z0-9.-]+$/.test(supabaseUrl);
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

  // O código PKCE só cria sessão no dispositivo que o pediu; noutro, a app entra com a palavra-passe.
  // Sem o endereço do Supabase, o token_hash segue para a app web, que o confirma.
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
  if (verifyHere) {
    // Confirma no Supabase, que volta a esta página com ?code= (ou com o erro) e daí abre a app.
    let type = query.get('type') || hash.get('type') || 'signup';
    if (type === 'email') type = 'signup';
    button.hidden = true;
    window.location.replace(
      supabaseUrl +
        '/auth/v1/verify?token=' +
        encodeURIComponent(tokenHash) +
        '&type=' +
        encodeURIComponent(type) +
        '&redirect_to=' +
        encodeURIComponent('https://miven.pt/auth/' + path),
    );
  } else if (tokenHash && !failed) {
    button.textContent = t.continueWeb;
    button.setAttribute('href', webTarget);
    window.location.replace(webTarget);
  } else {
    button.textContent = t.open;
    button.setAttribute('href', deepLink);
    // No telemóvel, abre logo a app: com o código entra já; sem ele, a app verifica sozinha.
    let mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile && !failed && (page === 'callback' || forward.has('code'))) {
      window.setTimeout(function () {
        window.location.href = deepLink;
      }, 400);
    }
  }
})();

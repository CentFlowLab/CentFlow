// Gera os modelos de email da autenticação (Supabase/GoTrue, Go templates) em
// supabase/templates/. Um modelo por tipo, com o texto na língua da conta: a app guarda
// `locale` ("pt", "en" ou "es") nos metadados do utilizador (ADR-035).
// Uso: node scripts/generate-email-templates.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const LOGO = 'https://miven.pt/assets/email-logo.png';
const SITE = 'https://miven.pt';

const COPY = {
  confirmation: {
    pt: {
      subject: 'Confirma o teu email no Miven',
      title: 'Confirma o teu email',
      body: 'Falta um passo para ativares a tua conta Miven. Confirma que este email é teu.',
      action: 'Confirmar email',
    },
    en: {
      subject: 'Confirm your email for Miven',
      title: 'Confirm your email',
      body: 'One more step to activate your Miven account. Confirm that this email is yours.',
      action: 'Confirm email',
    },
    es: {
      subject: 'Confirma tu email en Miven',
      title: 'Confirma tu email',
      body: 'Falta un paso para activar tu cuenta de Miven. Confirma que este email es tuyo.',
      action: 'Confirmar email',
    },
  },
  recovery: {
    pt: {
      subject: 'Repor a palavra-passe do Miven',
      title: 'Repor a palavra-passe',
      body: 'Pediste para repor a palavra-passe da tua conta Miven. Abre este link no telemóvel onde fizeste o pedido.',
      action: 'Escolher nova palavra-passe',
    },
    en: {
      subject: 'Reset your Miven password',
      title: 'Reset your password',
      body: 'You asked to reset the password for your Miven account. Open this link on the phone where you made the request.',
      action: 'Choose a new password',
    },
    es: {
      subject: 'Restablece tu contraseña de Miven',
      title: 'Restablecer contraseña',
      body: 'Pediste restablecer la contraseña de tu cuenta de Miven. Abre este enlace en el móvil donde hiciste la solicitud.',
      action: 'Elegir nueva contraseña',
    },
  },
  magic_link: {
    pt: {
      subject: 'O teu link para entrar no Miven',
      title: 'Entrar no Miven',
      body: 'Usa este link para entrares na tua conta. Só funciona uma vez.',
      action: 'Entrar',
    },
    en: {
      subject: 'Your Miven sign-in link',
      title: 'Sign in to Miven',
      body: 'Use this link to sign in to your account. It only works once.',
      action: 'Sign in',
    },
    es: {
      subject: 'Tu enlace para entrar en Miven',
      title: 'Entrar en Miven',
      body: 'Usa este enlace para entrar en tu cuenta. Solo funciona una vez.',
      action: 'Entrar',
    },
  },
  email_change: {
    pt: {
      subject: 'Confirma o novo email do Miven',
      title: 'Confirma o novo email',
      body: 'Pediste para mudar o email da tua conta Miven para {{ .NewEmail }}. Confirma a alteração.',
      action: 'Confirmar alteração',
    },
    en: {
      subject: 'Confirm your new Miven email',
      title: 'Confirm your new email',
      body: 'You asked to change your Miven account email to {{ .NewEmail }}. Confirm the change.',
      action: 'Confirm change',
    },
    es: {
      subject: 'Confirma tu nuevo email de Miven',
      title: 'Confirma tu nuevo email',
      body: 'Pediste cambiar el email de tu cuenta de Miven a {{ .NewEmail }}. Confirma el cambio.',
      action: 'Confirmar cambio',
    },
  },
  invite: {
    pt: {
      subject: 'Foste convidado para o Miven',
      title: 'Foste convidado',
      body: 'Recebeste um convite para criares a tua conta no Miven.',
      action: 'Aceitar convite',
    },
    en: {
      subject: "You've been invited to Miven",
      title: "You've been invited",
      body: 'You received an invitation to create your Miven account.',
      action: 'Accept invitation',
    },
    es: {
      subject: 'Te han invitado a Miven',
      title: 'Te han invitado',
      body: 'Recibiste una invitación para crear tu cuenta en Miven.',
      action: 'Aceptar invitación',
    },
  },
  reauthentication: {
    pt: {
      subject: 'O teu código do Miven',
      title: 'Confirma que és tu',
      body: 'Usa este código na app para continuares.',
      action: null,
    },
    en: {
      subject: 'Your Miven code',
      title: "Confirm it's you",
      body: 'Use this code in the app to continue.',
      action: null,
    },
    es: {
      subject: 'Tu código de Miven',
      title: 'Confirma que eres tú',
      body: 'Usa este código en la app para continuar.',
      action: null,
    },
  },
};

const FOOTER = {
  pt: {
    ignore: 'Se não foste tu, ignora este email. A tua conta não muda.',
    link: 'Se o botão não funcionar, copia este endereço para o browser:',
    sent: 'Enviado pelo Miven · O teu dinheiro, sob controlo.',
  },
  en: {
    ignore: "If this wasn't you, ignore this email. Your account doesn't change.",
    link: "If the button doesn't work, copy this address into your browser:",
    sent: 'Sent by Miven · Your money, under control.',
  },
  es: {
    ignore: 'Si no fuiste tú, ignora este email. Tu cuenta no cambia.',
    link: 'Si el botón no funciona, copia esta dirección en el navegador:',
    sent: 'Enviado por Miven · Tu dinero, bajo control.',
  },
};

// O idioma vem dos metadados da conta; sem valor, português.
const LANG = '{{ $l := or .Data.locale "pt" }}';

function block(copy, footer) {
  const action = copy.action
    ? `<tr><td align="center" style="padding:8px 32px 8px">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#10B981;color:#101B2D;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px">${copy.action}</a>
</td></tr>
<tr><td style="padding:16px 32px 0;font-size:13px;line-height:1.5;color:#475569">${footer.link}<br><a href="{{ .ConfirmationURL }}" style="color:#047857;word-break:break-all">{{ .ConfirmationURL }}</a></td></tr>`
    : `<tr><td align="center" style="padding:8px 32px">
<div style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:700;color:#101B2D;background:#EEF2F6;border-radius:12px;padding:12px 20px">{{ .Token }}</div>
</td></tr>`;
  return `<tr><td style="padding:8px 32px 0"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#101B2D">${copy.title}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155">${copy.body}</p></td></tr>
${action}
<tr><td style="padding:24px 32px 32px;font-size:13px;line-height:1.5;color:#475569">${footer.ignore}</td></tr>`;
}

function html(type) {
  const c = COPY[type];
  const body = `{{ if eq $l "en" }}${block(c.en, FOOTER.en)}{{ else if eq $l "es" }}${block(c.es, FOOTER.es)}{{ else }}${block(c.pt, FOOTER.pt)}{{ end }}`;
  const sent = `{{ if eq $l "en" }}${FOOTER.en.sent}{{ else if eq $l "es" }}${FOOTER.es.sent}{{ else }}${FOOTER.pt.sent}{{ end }}`;
  return `${LANG}<!doctype html>
<html lang="{{ $l }}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Miven</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0">
<tr><td style="background:#101B2D;padding:20px 32px"><a href="${SITE}" style="text-decoration:none;color:#FFFFFF"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${LOGO}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px;border-radius:10px"></td><td style="vertical-align:middle;padding-left:12px;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#FFFFFF">Miven</td></tr></table></a></td></tr>
<tr><td style="height:16px"></td></tr>
${body}
</table>
<p style="margin:16px 0 0;font-size:12px;color:#64748B">${sent}<br><a href="${SITE}" style="color:#64748B">miven.pt</a></p>
</td></tr>
</table>
</body>
</html>
`;
}

function subject(type) {
  const c = COPY[type];
  return `${LANG}{{ if eq $l "en" }}${c.en.subject}{{ else if eq $l "es" }}${c.es.subject}{{ else }}${c.pt.subject}{{ end }}`;
}

mkdirSync('supabase/templates', { recursive: true });
const subjects = {};
for (const type of Object.keys(COPY)) {
  writeFileSync(`supabase/templates/${type}.html`, html(type));
  subjects[type] = subject(type);
}
writeFileSync('supabase/templates/subjects.json', `${JSON.stringify(subjects, null, 2)}\n`);
console.log(`Modelos gerados: ${Object.keys(COPY).join(', ')}`);

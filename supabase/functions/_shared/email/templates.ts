import type { EmailTemplatePayload, EmailUserContext, LifecycleEmailType } from './types.ts';
import { renderEmailHtml, renderPlainText } from './template-shell.ts';
import { buildDeepLink, getFirstStepPath, getFirstStepSuggestion } from './utils.ts';

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Olá';
  return trimmed.split(' ')[0] ?? trimmed;
}

export function buildEmailTemplate(
  type: LifecycleEmailType,
  user: EmailUserContext,
  extras: Record<string, string> = {},
): EmailTemplatePayload {
  const name = firstName(user.name);
  const greeting = `Olá ${name},`;

  switch (type) {
    case 'welcome':
      return wrap({
        subject: 'Bem-vindo à CentFlow 👋',
        preheader: 'A tua app financeira está pronta.',
        greeting,
        body: 'Bem-vindo à CentFlow. Organiza gastos, objetivos e património num só lugar — com clareza e segurança.',
        ctaLabel: 'Abrir a CentFlow',
        ctaUrl: buildDeepLink('(tabs)/'),
      });

    case 'onboarding_incomplete':
      return wrap({
        subject: 'Ainda não terminaste a configuração da tua CentFlow',
        preheader: 'Faltam poucos passos para personalizar a app.',
        greeting,
        body: 'A tua CentFlow está quase pronta. Termina a configuração para veres a app adaptada aos teus objectivos.',
        ctaLabel: 'Continuar configuração',
        ctaUrl: buildDeepLink('onboarding'),
      });

    case 'first_step_missing': {
      const suggestion = getFirstStepSuggestion(user.primaryObjective);
      return wrap({
        subject: 'Dá o primeiro passo na tua CentFlow',
        preheader: suggestion,
        greeting,
        body: `${suggestion}. Um único registo ajuda-te a perceber melhor as tuas finanças.`,
        ctaLabel: 'Começar agora',
        ctaUrl: buildDeepLink(getFirstStepPath(user.primaryObjective)),
      });
    }

    case 'inactive_7d':
      return wrap({
        subject: 'A tua CentFlow está à tua espera',
        preheader: 'Retoma onde ficaste.',
        greeting,
        body: 'Faz algum tempo desde a tua última visita. A tua CentFlow mantém-se pronta para continuares de onde ficaste.',
        ctaLabel: 'Voltar à CentFlow',
        ctaUrl: buildDeepLink('(tabs)/'),
      });

    case 'inactive_30d':
      return wrap({
        subject: 'Ainda queres organizar as tuas finanças?',
        preheader: 'Estamos aqui quando quiseres retomar.',
        greeting,
        body: 'Organizar finanças é um hábito — e estamos aqui para te ajudar quando quiseres voltar.',
        ctaLabel: 'Retomar',
        ctaUrl: buildDeepLink('(tabs)/'),
      });

    case 'warranty_expiring':
      return wrap({
        subject: 'Uma garantia está quase a expirar',
        preheader: 'Verifica os detalhes na app.',
        greeting,
        body: `Tens uma garantia a expirar em breve${extras.product ? ` (${extras.product})` : ''}. Consulta os detalhes na app.`,
        ctaLabel: 'Ver garantia',
        ctaUrl: buildDeepLink('ativos?action=new-warranty'),
      });

    case 'subscription_renewal':
      return wrap({
        subject: 'Subscrição a renovar em breve',
        preheader: 'Prepara-te para a renovação.',
        greeting,
        body: `A subscrição${extras.name ? ` ${extras.name}` : ''} renova em breve. Revê os detalhes na CentFlow.`,
        ctaLabel: 'Ver subscrição',
        ctaUrl: buildDeepLink('movimentos?view=subscricoes'),
      });

    case 'credit_payment_due':
      return wrap({
        subject: 'Prestação próxima',
        preheader: 'Tens um pagamento a aproximar-se.',
        greeting,
        body: `Tens uma prestação a aproximar-se${extras.name ? ` (${extras.name})` : ''}. Consulta os detalhes na app.`,
        ctaLabel: 'Ver crédito',
        ctaUrl: buildDeepLink('precos'),
      });

    case 'weekly_digest':
      return wrap({
        subject: 'O teu resumo financeiro semanal',
        preheader: 'Movimentos, objectivos e próximos prazos.',
        greeting,
        body: extras.summary ??
          'Aqui está o teu resumo semanal. Abre a CentFlow para ver movimentos, evolução e próximas acções.',
        ctaLabel: 'Ver resumo completo',
        ctaUrl: buildDeepLink('(tabs)/'),
      });

    case 'tips_insight':
      return wrap({
        subject: 'Uma dica para as tuas finanças',
        preheader: extras.tip ?? 'Sugestão personalizada na CentFlow.',
        greeting,
        body: extras.tip ??
          'Temos uma sugestão que pode ajudar-te a organizar melhor as tuas finanças. Vê os insights na app.',
        ctaLabel: 'Ver insights',
        ctaUrl: buildDeepLink('analises'),
      });

    default:
      return wrap({
        subject: 'CentFlow',
        preheader: 'Novidades na tua app financeira.',
        greeting,
        body: 'Tens novidades na CentFlow.',
        ctaLabel: 'Abrir a CentFlow',
        ctaUrl: buildDeepLink('(tabs)/'),
      });
  }
}

function wrap(input: {
  subject: string;
  preheader: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): EmailTemplatePayload {
  const shell = {
    preheader: input.preheader,
    greeting: input.greeting,
    body: input.body,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
  };

  return {
    subject: input.subject,
    ctaUrl: input.ctaUrl,
    ctaLabel: input.ctaLabel,
    html: renderEmailHtml(shell),
    text: renderPlainText(shell),
  };
}

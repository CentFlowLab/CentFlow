const BRAND = '#2DD4BF';
const BG = '#0A1214';
const SURFACE = '#122023';
const TEXT = '#E8F4F2';
const MUTED = '#8BA3A0';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

type TemplateInput = {
  preheader: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
};

export function renderEmailHtml(input: TemplateInput): string {
  const greeting = escapeHtml(input.greeting);
  const body = escapeHtml(input.body);
  const ctaLabel = escapeHtml(input.ctaLabel);
  const ctaUrl = escapeHtml(input.ctaUrl);
  const footer = escapeHtml(input.footer ?? 'CentFlow — finanças pessoais com clareza.');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CentFlow</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:${SURFACE};border-radius:16px;border:1px solid #1E3336;">
          <tr>
            <td style="padding:28px 24px;color:${TEXT};">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND};letter-spacing:0.04em;text-transform:uppercase;">CentFlow</p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${TEXT};">${greeting}</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${MUTED};">${body}</p>
              <a href="${ctaUrl}" style="display:inline-block;background:${BRAND};color:#041012;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;font-size:15px;">${ctaLabel}</a>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPlainText(input: TemplateInput): string {
  return `${input.greeting}\n\n${input.body}\n\n${input.ctaLabel}: ${input.ctaUrl}\n\n— CentFlow`;
}

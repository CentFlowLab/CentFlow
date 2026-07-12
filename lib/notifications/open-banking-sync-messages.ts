import { pluralize } from '@/lib/utils/pluralize';

export function buildImportDigestMessage(imported: number, lowConfidence: number): string {
  const base =
    imported === 1
      ? '1 nova transação importada'
      : pluralize(imported, 'nova transação importada', 'novas transações importadas');

  if (lowConfidence <= 0) {
    return `${base}.`;
  }

  const categoryPart =
    lowConfidence === 1
      ? '1 categorizada automaticamente com baixa confiança'
      : pluralize(
          lowConfidence,
          'categorizada automaticamente com baixa confiança',
          'categorizadas automaticamente com baixa confiança',
        );

  return `${base}, ${categoryPart} — revê quando puderes.`;
}

export function buildConsentExpiryMessage(institutionName: string, daysLeft: number): string {
  if (daysLeft <= 0) {
    return `O consentimento de ${institutionName} expirou. Renova a ligação para continuar a importar movimentos.`;
  }

  const dayLabel = pluralize(daysLeft, 'dia', 'dias');
  return `O consentimento de ${institutionName} expira em ${dayLabel}. Renova a ligação em Definições → Ligações bancárias.`;
}

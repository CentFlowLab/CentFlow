const AUTO_CATEGORIES: Record<string, string> = {
  vodafone: 'Telecomunicações',
  meo: 'Telecomunicações',
  nos: 'Telecomunicações',
  net: 'Telecomunicações',
  tarifário: 'Telecomunicações',
  tarifario: 'Telecomunicações',
  telemovel: 'Telecomunicações',
  telemóvel: 'Telecomunicações',
  iphone: 'Tecnologia',
  apple: 'Tecnologia',
  google: 'Tecnologia',
  microsoft: 'Tecnologia',
  netflix: 'Streaming',
  spotify: 'Streaming',
  youtube: 'Streaming',
  disney: 'Streaming',
  seguro: 'Seguros',
};

const GENERIC_CATEGORIES = new Set(['outros', 'other', '']);

/** Categorização automática por nome — só quando categoria é genérica ou ausente. */
export function autoCategorizeSubscription(name: string): string | null {
  const normalized = name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  for (const [key, category] of Object.entries(AUTO_CATEGORIES)) {
    const keyNorm = key.normalize('NFD').replace(/\p{M}/gu, '');
    if (normalized.includes(keyNorm)) return category;
  }
  return null;
}

export function resolveSubscriptionCategory(
  name: string,
  existingCategory?: string | null,
): string | undefined {
  const existing = existingCategory?.trim().toLowerCase() ?? '';
  if (existing && !GENERIC_CATEGORIES.has(existing)) {
    return existingCategory!.trim();
  }
  return autoCategorizeSubscription(name) ?? existingCategory?.trim() ?? undefined;
}

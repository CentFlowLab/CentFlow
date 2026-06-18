/** Campo de texto com conteúdo (após trim). */
export function hasTextValue(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

/** Verdadeiro se algum campo de texto tiver valor. */
export function formHasAnyText(...values: Array<string | undefined | null>): boolean {
  return values.some(hasTextValue);
}

/** Compara campos string normalizados com baseline (modo edição). */
export function formFieldsDiffer(
  current: Record<string, string | undefined | null>,
  baseline: Record<string, string | undefined | null>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);

  for (const key of keys) {
    const a = (current[key] ?? '').trim();
    const b = (baseline[key] ?? '').trim();
    if (a !== b) return true;
  }

  return false;
}

/** Compara valores primitivos (intervalos, enums, flags). */
export function formScalarsDiffer(
  current: Record<string, string | boolean | number | undefined | null>,
  baseline: Record<string, string | boolean | number | undefined | null>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);

  for (const key of keys) {
    if (current[key] !== baseline[key]) return true;
  }

  return false;
}

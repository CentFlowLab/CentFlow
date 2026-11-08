/** Referência do projeto Miven de produção. Os comandos de staging recusam-na. */
export const PRODUCTION_PROJECT_REF = 'slfgslfzolfvqavuccom';

/** Referência do projeto Miven de staging. É o único destino aceite. */
export const STAGING_PROJECT_REF = 'qlimqcgrgaqzwjmafora';

export class StagingTargetError extends Error {
  constructor() {
    super('Destino de staging recusado. O comando só aceita o projeto de staging.');
    this.name = 'StagingTargetError';
  }
}

/** Aceita a referência ou um URL que a contenha. Recusa produção, vazio e qualquer outro projeto. */
export function assertStagingTarget(target: string): void {
  const value = target.trim();
  if (
    value.length === 0 ||
    value.includes(PRODUCTION_PROJECT_REF) ||
    !value.includes(STAGING_PROJECT_REF)
  ) {
    throw new StagingTargetError();
  }
}

/** Confirma os argumentos e as variáveis de ambiente que um comando de staging pode herdar. */
export function assertStagingCommand(
  args: readonly string[],
  env: { MIVEN_STAGING_TARGET?: string; EXPO_PUBLIC_SUPABASE_URL?: string },
): void {
  const candidates = [
    args.join(' '),
    env.MIVEN_STAGING_TARGET,
    env.EXPO_PUBLIC_SUPABASE_URL,
  ].filter((value): value is string => value != null && value.trim() !== '');
  if (candidates.length === 0) assertStagingTarget('');
  for (const candidate of candidates) assertStagingTarget(candidate);
}

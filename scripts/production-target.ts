/** Iguais a `staging-target.ts`. O teste compara os dois módulos. */
export const PRODUCTION_PROJECT_REF = 'slfgslfzolfvqavuccom';
export const STAGING_PROJECT_REF = 'qlimqcgrgaqzwjmafora';

/** Frase que o responsável tem de escrever no comando. Não é um segredo. */
export const PRODUCTION_CONFIRMATION = 'CONFIRMO-PRODUCAO';

export class ProductionTargetError extends Error {
  constructor() {
    super(
      'Destino de produção recusado. O comando só aceita o projeto de produção e a confirmação explícita.',
    );
    this.name = 'ProductionTargetError';
  }
}

/** Aceita a referência ou um URL que a contenha. Recusa staging, vazio e qualquer outro projeto. */
export function assertProductionTarget(target: string): void {
  const value = target.trim();
  if (
    value.length === 0 ||
    value.includes(STAGING_PROJECT_REF) ||
    !value.includes(PRODUCTION_PROJECT_REF)
  ) {
    throw new ProductionTargetError();
  }
}

/**
 * O comando tem de nomear a produção e incluir `CONFIRMO-PRODUCAO`.
 * Uma variável herdada com outro projeto também recusa o comando.
 */
export function assertProductionCommand(
  args: readonly string[],
  env: { MIVEN_PRODUCTION_TARGET?: string; EXPO_PUBLIC_SUPABASE_URL?: string },
): void {
  const tokens = args.map((arg) => arg.trim()).filter((arg) => arg.length > 0);
  if (!tokens.includes(PRODUCTION_CONFIRMATION)) throw new ProductionTargetError();
  const command = tokens.filter((arg) => arg !== PRODUCTION_CONFIRMATION).join(' ');
  assertProductionTarget(command);
  for (const inherited of [env.MIVEN_PRODUCTION_TARGET, env.EXPO_PUBLIC_SUPABASE_URL]) {
    if (inherited != null && inherited.trim() !== '') assertProductionTarget(inherited);
  }
}

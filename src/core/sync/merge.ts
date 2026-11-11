/**
 * Fusão a três vias de um registo sincronizado (base, local, servidor).
 *
 * Regras (não dependem de relógios):
 * - campos alterados só de um lado são combinados automaticamente;
 * - o mesmo campo alterado dos dois lados com valores diferentes é um conflito;
 * - campos acoplados (ex.: tipo, categoria e contas de um movimento) são tratados como um só,
 *   para nunca produzir uma combinação que nenhum dos lados escreveu;
 * - eliminar de um lado e editar do outro é sempre um conflito: uma edição nunca é apagada
 *   em silêncio, nem uma eliminação desfeita em silêncio.
 */

export type SyncEntity =
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'subscriptions'
  | 'goals'
  | 'goal_contributions'
  | 'wealth_items'
  | 'vehicles'
  | 'documents'
  | 'entries';

export type SyncValue = string | number | null;
export type SyncRecord = Readonly<Record<string, SyncValue>>;

/** Campos sincronizados e editáveis de cada entidade (`created_at` é imutável). */
export const SYNC_FIELDS: Readonly<Record<SyncEntity, readonly string[]>> = {
  accounts: [
    'name',
    'type',
    'currency',
    'initial_balance',
    'archived_at',
    'credit_limit',
    'institution',
    'statement_day',
    'due_day',
    'payment_account_id',
    'color',
    'deleted_at',
  ],
  categories: ['name', 'type', 'icon', 'color', 'system_key', 'essential', 'deleted_at'],
  budgets: ['category_id', 'amount', 'currency', 'period', 'starts_on', 'deleted_at'],
  subscriptions: [
    'name',
    'amount',
    'currency',
    'period',
    'status',
    'starts_on',
    'next_on',
    'category_id',
    'previous_amount',
    'amount_changed_on',
    'deleted_at',
  ],
  goals: ['name', 'target_amount', 'currency', 'target_on', 'deleted_at'],
  goal_contributions: ['goal_id', 'amount', 'date', 'deleted_at'],
  wealth_items: [
    'name',
    'type',
    'amount',
    'currency',
    'valued_on',
    'value_history',
    'closed_on',
    'loan_kind',
    'institution',
    'principal_amount',
    'started_on',
    'opening_debt',
    'opening_on',
    'interest_rate_bp',
    'installment_amount',
    'due_day',
    'ends_on',
    'deleted_at',
  ],
  vehicles: [
    'name',
    'kind',
    'plate',
    'odometer_km',
    'inspection_due',
    'insurance_due',
    'make',
    'model',
    'year',
    'fuel_type',
    'acquired_on',
    'purchase_amount',
    'currency',
    'road_tax_due',
    'service_due_on',
    'service_due_km',
    'notes',
    'kind_label',
    'icon',
    'deleted_at',
  ],
  documents: [
    'title',
    'category',
    'expires_on',
    'notes',
    'vehicle_id',
    'attachments',
    'acquired_on',
    'amount',
    'currency',
    'deleted_at',
  ],
  entries: [
    'type',
    'amount',
    'description',
    'notes',
    'category_id',
    'account_id',
    'destination_account_id',
    'date',
    'vehicle_id',
    'vehicle_cost_type',
    'quantity_milli',
    'odometer_km',
    'loan_id',
    'loan_role',
    'principal_amount',
    'interest_amount',
    'fees_amount',
    'deleted_at',
  ],
};

const COUPLED: Readonly<Record<SyncEntity, readonly (readonly string[])[]>> = {
  accounts: [],
  categories: [],
  budgets: [],
  // O preço anterior só faz sentido com o valor que o substituiu.
  subscriptions: [['amount', 'previous_amount', 'amount_changed_on']],
  goals: [],
  goal_contributions: [],
  // O histórico das avaliações acompanha o valor e a data que o substituíram.
  wealth_items: [['amount', 'valued_on', 'value_history']],
  // Valor de compra e moeda mudam juntos.
  vehicles: [['purchase_amount', 'currency']],
  // Valor de compra e moeda mudam juntos.
  documents: [['amount', 'currency']],
  // A ligação ao veículo (veículo + tipo de custo) é um todo; um abastecimento também (valor,
  // quantidade e km): combinar partes de versões diferentes daria um preço por litro que ninguém
  // registou (docs/fase1-veiculos.md §5).
  entries: [
    ['type', 'category_id', 'account_id', 'destination_account_id'],
    ['vehicle_id', 'vehicle_cost_type'],
    [
      'amount',
      'quantity_milli',
      'odometer_km',
      'principal_amount',
      'interest_amount',
      'fees_amount',
    ],
    // A ligação ao empréstimo é um todo (ADR-057).
    ['loan_id', 'loan_role'],
  ],
};

export type MergeResult =
  /** Os dois lados já coincidem: nada a enviar. */
  | { kind: 'same' }
  /** Combinação sem conflito, a enviar com base na versão do servidor. */
  | { kind: 'merged'; data: Record<string, SyncValue> }
  | { kind: 'conflict'; fields: string[] };

function units(entity: SyncEntity): string[][] {
  const coupled = COUPLED[entity];
  const grouped = new Set(coupled.flat());
  return [
    ...coupled.map((group) => [...group]),
    ...SYNC_FIELDS[entity].filter((field) => !grouped.has(field)).map((field) => [field]),
  ];
}

function value(record: SyncRecord | null, field: string): SyncValue {
  return record?.[field] ?? null;
}

/** O instante de uma eliminação não é uma alteração: só conta se o registo está eliminado. */
function comparable(record: SyncRecord | null, field: string): SyncValue | boolean {
  const current = value(record, field);
  return field === 'deleted_at' ? current !== null : current;
}

function differs(a: SyncRecord | null, b: SyncRecord | null, fields: readonly string[]): boolean {
  return fields.some((field) => comparable(a, field) !== comparable(b, field));
}

/**
 * `base` é a versão que o dispositivo leu antes de editar (`null` se o registo foi criado
 * localmente). Sem base, qualquer diferença é conflito.
 */
export function mergeRecords(
  entity: SyncEntity,
  base: SyncRecord | null,
  local: SyncRecord,
  server: SyncRecord,
): MergeResult {
  const fields = SYNC_FIELDS[entity];
  if (!differs(local, server, fields)) return { kind: 'same' };
  if (!base) {
    return { kind: 'conflict', fields: fields.filter((field) => differs(local, server, [field])) };
  }

  const deletion = ['deleted_at'];
  const others = fields.filter((field) => field !== 'deleted_at');
  const localDeleted = differs(base, local, deletion);
  const serverDeleted = differs(base, server, deletion);
  const localEdited = differs(base, local, others);
  const serverEdited = differs(base, server, others);
  if ((localDeleted && serverEdited) || (serverDeleted && localEdited)) {
    return { kind: 'conflict', fields: ['deleted_at'] };
  }

  const merged: Record<string, SyncValue> = {};
  const conflicts: string[] = [];
  for (const unit of units(entity)) {
    const localChanged = differs(base, local, unit);
    const serverChanged = differs(base, server, unit);
    if (localChanged && serverChanged && differs(local, server, unit)) {
      conflicts.push(...unit);
      continue;
    }
    const source = localChanged ? local : server;
    for (const field of unit) merged[field] = value(source, field);
  }
  if (conflicts.length > 0) return { kind: 'conflict', fields: conflicts };
  if (!differs(merged, server, fields)) return { kind: 'same' };
  return { kind: 'merged', data: merged };
}

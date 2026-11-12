import { sha256Hex } from './sha256';

export type BackupValue = string | number | null;
export type BackupRow = Record<string, BackupValue> & { id: string; updated_at: string };

export const BACKUP_FORMAT = 'miven-backup';
export const BACKUP_VERSION = 1;

/**
 * Cópia de segurança completa (JSON). As tabelas vêm pela ordem das dependências; só linhas
 * ativas. `sha256` cobre o esquema e as tabelas: um ficheiro alterado ou cortado é recusado.
 */
export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  schemaVersion: number;
  appVersion: string;
  tables: Record<string, BackupRow[]>;
  counts: Record<string, number>;
  /** Anexos dos documentos: ficam no servidor; aqui só a lista, para referência. */
  attachments: { documentId: string; name: string; size: number }[];
  sha256: string;
};

function digestOf(schemaVersion: number, tables: Record<string, BackupRow[]>): string {
  return sha256Hex(JSON.stringify({ schemaVersion, tables }));
}

export function buildBackup(
  input: Omit<BackupFile, 'format' | 'version' | 'counts' | 'sha256'>,
): BackupFile {
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(input.tables)) counts[table] = rows.length;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    ...input,
    counts,
    sha256: digestOf(input.schemaVersion, input.tables),
  };
}

export type BackupCheck =
  { ok: true; backup: BackupFile } | { ok: false; reason: 'notBackup' | 'corrupted' | 'tooNew' };

/** Lê e verifica um ficheiro: formato, integridade (SHA-256) e versão do esquema. */
export function parseBackup(text: string, currentSchemaVersion: number): BackupCheck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notBackup' };
  }
  const file = value as Partial<BackupFile> | null;
  if (!file || file.format !== BACKUP_FORMAT || typeof file.tables !== 'object' || !file.tables) {
    return { ok: false, reason: 'notBackup' };
  }
  if (
    typeof file.schemaVersion !== 'number' ||
    file.sha256 !== digestOf(file.schemaVersion, file.tables)
  ) {
    return { ok: false, reason: 'corrupted' };
  }
  if (file.schemaVersion > currentSchemaVersion || (file.version ?? 0) > BACKUP_VERSION) {
    return { ok: false, reason: 'tooNew' };
  }
  return { ok: true, backup: file as BackupFile };
}

export type LocalRowState = { updated_at: string; deleted_at: string | null };

export type RestorePlan = {
  /** Linhas que não existem aqui: entram. */
  insert: Record<string, BackupRow[]>;
  /** Linhas mais antigas aqui do que na cópia: a cópia substitui-as. */
  update: Record<string, BackupRow[]>;
  /** Mais recentes (ou iguais) aqui: ficam como estão. */
  keptNewer: number;
  /** Eliminadas aqui depois da cópia: não voltam sem a pessoa as recriar. */
  keptDeleted: number;
  totalInsert: number;
  totalUpdate: number;
};

/**
 * Plano de restauro que **nunca** sobrescreve dados mais recentes: compara `updated_at` linha a
 * linha. Sem efeitos: quem chama mostra o resumo e só aplica depois de confirmação.
 */
export function planRestore(
  backup: Pick<BackupFile, 'tables'>,
  local: (table: string) => ReadonlyMap<string, LocalRowState>,
): RestorePlan {
  const plan: RestorePlan = {
    insert: {},
    update: {},
    keptNewer: 0,
    keptDeleted: 0,
    totalInsert: 0,
    totalUpdate: 0,
  };
  for (const [table, rows] of Object.entries(backup.tables)) {
    const existing = local(table);
    for (const row of rows) {
      const current = existing.get(row.id);
      if (!current) {
        (plan.insert[table] ??= []).push(row);
        plan.totalInsert += 1;
      } else if (current.deleted_at !== null) {
        plan.keptDeleted += 1;
      } else if (row.updated_at > current.updated_at) {
        (plan.update[table] ??= []).push(row);
        plan.totalUpdate += 1;
      } else {
        plan.keptNewer += 1;
      }
    }
  }
  return plan;
}

/** CSV dos movimentos (separador vírgula, aspas quando preciso, valores com ponto decimal). */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly BackupValue[])[],
): string {
  const cell = (value: BackupValue) => {
    if (value === null) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

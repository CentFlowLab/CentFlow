import type { AppLogEntry } from './app-log';
import type { HumanErrorInfo } from './doctor-types';

const STEP_LABELS: Record<string, string> = {
  validation_start: 'Validação',
  validation_fail: 'Validação',
  validation_success: 'Validação',
  save_click: 'Guardar',
  mutation_start: 'Mutation',
  mutation_phase: 'Mutation',
  mutation_service_start: 'Serviço',
  mutation_service_supabase_auth: 'Autenticação Supabase',
  mutation_service_supabase_insert: 'Supabase insert',
  mutation_service_supabase_receipt_url: 'URL do talão',
  mutation_service_done: 'Serviço concluído',
  mutation_success: 'Sucesso',
  mutation_error: 'Erro na mutation',
  mutation_settled: 'Concluído',
  cache_invalidate_start: 'Invalidar cache',
  cache_invalidate_done: 'Cache actualizado',
  modal_close: 'Fechar modal',
  sheet_close: 'Fechar sheet',
  stall_detected: 'Operação bloqueada',
  ocr_start: 'OCR iniciado',
  upload_start: 'Upload',
  upload_success: 'Upload concluído',
  parse_start: 'Análise OCR',
  parse_success: 'OCR concluído',
  parse_failed: 'OCR falhou',
  ocr_error: 'Erro OCR',
  open: 'Abrir',
  save_start: 'Guardar',
  save_success: 'Guardado',
  save_error: 'Erro ao guardar',
  modal_open: 'Abrir modal',
  service_start: 'Serviço',
  service_success: 'Serviço concluído',
  link_received: 'Deep link recebido',
};

const ERROR_TRANSLATIONS: Array<{
  test: RegExp;
  translate: (match: RegExpMatchArray, raw: string) => Omit<HumanErrorInfo, 'technicalMessage' | 'stack'>;
}> = [
  {
    test: /Could not find the '(\w+)' column/i,
    translate: (m) => ({
      title: 'Coluna em falta na base de dados',
      message: `A coluna «${m[1]}» não existe na tabela.`,
      possibleCause: 'Migração não aplicada no Supabase.',
      solution: `Executar migration que adiciona a coluna «${m[1]}».`,
    }),
  },
  {
    test: /relation "([^"]+)" does not exist/i,
    translate: (m) => ({
      title: 'Tabela em falta',
      message: `A tabela «${m[1]}» não existe.`,
      possibleCause: 'Schema desactualizado.',
      solution: 'Aplicar migrações pendentes no Supabase.',
    }),
  },
  {
    test: /row-level security|RLS|policy/i,
    translate: () => ({
      title: 'Permissão negada (RLS)',
      message: 'A operação foi bloqueada pelas políticas de segurança.',
      possibleCause: 'Sessão inválida ou política RLS demasiado restritiva.',
      solution: 'Verifica login e policies RLS da tabela.',
    }),
  },
  {
    test: /JWT|refresh token|session/i,
    translate: () => ({
      title: 'Sessão expirada',
      message: 'A sessão de autenticação não é válida.',
      possibleCause: 'Token expirado ou logout noutro dispositivo.',
      solution: 'Faz login novamente.',
    }),
  },
  {
    test: /network|fetch failed|offline|timeout/i,
    translate: () => ({
      title: 'Problema de rede',
      message: 'Não foi possível comunicar com o servidor.',
      possibleCause: 'Sem ligação à internet ou Supabase indisponível.',
      solution: 'Verifica a ligação e tenta outra vez.',
    }),
  },
  {
    test: /duplicate key|unique constraint/i,
    translate: () => ({
      title: 'Registo duplicado',
      message: 'Já existe um registo com estes dados.',
      possibleCause: 'Tentativa de criar um item que já existe.',
      solution: 'Edita o registo existente em vez de criar outro.',
    }),
  },
];

export function humanizeStep(stepOrMessage: string): string {
  const key = stepOrMessage.trim();
  if (STEP_LABELS[key]) return STEP_LABELS[key];
  if (key.includes('validation')) return 'Validação';
  if (key.includes('supabase')) return 'Supabase';
  if (key.includes('cache')) return 'Cache';
  if (key.includes('mutation')) return 'Mutation';
  if (key.includes('ocr') || key.includes('parse')) return 'OCR';
  if (key.includes('stall')) return 'Operação bloqueada';
  return key.replace(/_/g, ' ');
}

export function humanizeError(entry: AppLogEntry): HumanErrorInfo | undefined {
  if (entry.level !== 'error' && entry.severity !== 'critical') return undefined;

  const raw = entry.message || String(entry.context?.step ?? 'Erro');
  for (const rule of ERROR_TRANSLATIONS) {
    const match = raw.match(rule.test);
    if (match) {
      const translated = rule.translate(match, raw);
      return {
        ...translated,
        technicalMessage: raw,
        stack: entry.stack,
      };
    }
  }

  return {
    title: 'Erro na operação',
    message: raw.length > 120 ? `${raw.slice(0, 120)}…` : raw,
    possibleCause: 'Consulta o detalhe técnico para mais contexto.',
    technicalMessage: raw,
    stack: entry.stack,
  };
}

export function resolveOperationTitle(action: string, entries: AppLogEntry[]): string {
  const a = action.toLowerCase();

  if (a.includes('movement_create') || a === 'create_transaction') return 'Movimento criado';
  if (a.includes('movement_update')) return 'Movimento editado';
  if (a.includes('movement_delete')) return 'Movimento eliminado';
  if (a.includes('goal_contribution') || a.includes('goal_contribute')) return 'Contribuição para objetivo';
  if (a.includes('goal_create')) return 'Objetivo criado';
  if (a.includes('goal_update')) return 'Objetivo editado';
  if (a.includes('goal_delete')) return 'Objetivo eliminado';
  if (a.includes('account')) return 'Conta';
  if (a.includes('ocr') || entries.some((e) => e.source === 'ocr_flow')) return 'Processamento OCR';
  if (a.includes('credit')) return 'Crédito';
  if (a.includes('subscription')) return 'Despesa recorrente';
  if (a.includes('login') || a.includes('auth')) return 'Autenticação';
  if (a.includes('logout')) return 'Logout';
  if (a.includes('quick_expense')) return 'Gasto rápido';

  const step = String(entries.find((e) => e.context?.step)?.context?.step ?? '');
  if (step === 'save_click') return 'Movimento criado';

  return humanizeStep(action) || 'Operação';
}

export function resolveOperationCategory(action: string, source: string): import('./doctor-types').DoctorCategory {
  const key = `${action} ${source}`.toLowerCase();
  if (key.includes('movement') || key.includes('transaction')) return 'movement';
  if (key.includes('goal')) return 'goal';
  if (key.includes('account')) return 'account';
  if (key.includes('ocr')) return 'ocr';
  if (key.includes('login') || key.includes('logout') || key.includes('auth')) return 'auth';
  if (key.includes('cache')) return 'cache';
  if (key.includes('supabase') || source.includes('supabase')) return 'supabase';
  if (key.includes('react-query')) return 'sync';
  return 'other';
}

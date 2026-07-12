/** Port determinístico das queries do assistente — sem LLM, sem @/ imports. */

export type AssistantIntent =
  | 'daily_spend_limit'
  | 'can_i_buy'
  | 'when_runs_out'
  | 'debt_vs_save'
  | 'monthly_overview'
  | 'unsupported';

export type MotorSnapshot = {
  asOf: string;
  availableThisMonth: number;
  dailySafeSpend: number;
  marginReal: number;
  daysRemaining: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  totalDebt: number;
  monthlyDebtPayments: number;
  firstRiskDay?: { date: string; balance: number };
  balanceAt30Days?: number;
  negativeCrossingDate?: string;
  debtVsSaveHint?: string;
};

export type QueryResult = {
  intent: AssistantIntent;
  supported: boolean;
  facts: Record<string, string | number | boolean | null>;
  summary: string;
  headline: string;
};

function money(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function executeAssistantQueryPorted(
  intent: AssistantIntent,
  params: { amount?: number; category?: string },
  snapshot: MotorSnapshot,
): QueryResult {
  switch (intent) {
    case 'daily_spend_limit':
      return {
        intent,
        supported: true,
        facts: {
          dailySafeSpend: snapshot.dailySafeSpend,
          availableThisMonth: snapshot.availableThisMonth,
          marginReal: snapshot.marginReal,
          daysRemaining: snapshot.daysRemaining,
        },
        summary: `Margem real ${money(snapshot.marginReal)}, gasto seguro hoje ${money(snapshot.dailySafeSpend)}.`,
        headline:
          snapshot.dailySafeSpend > 0
            ? `Podes gastar até ${money(snapshot.dailySafeSpend)} hoje.`
            : 'Sem margem diária segura até ao fim do mês.',
      };

    case 'can_i_buy': {
      const amount = round(params.amount ?? 0);
      if (amount <= 0) {
        return {
          intent,
          supported: false,
          facts: { amount: null },
          summary: 'Valor não identificado.',
          headline: 'Indica quanto queres gastar (ex: 150€).',
        };
      }
      const marginAfter = round(snapshot.marginReal - amount);
      return {
        intent,
        supported: true,
        facts: {
          amount,
          marginBefore: snapshot.marginReal,
          marginAfter,
          goesNegativeThisMonth: marginAfter < 0,
        },
        summary: `Margem após ${money(amount)}: ${money(marginAfter)}.`,
        headline:
          marginAfter > 0
            ? `Com ${money(amount)}, ainda tens ${money(marginAfter)} de margem real.`
            : `Com ${money(amount)}, ficas sem margem real este mês.`,
      };
    }

    case 'when_runs_out':
      return {
        intent,
        supported: true,
        facts: {
          marginReal: snapshot.marginReal,
          daysRemaining: snapshot.daysRemaining,
          firstRiskDate: snapshot.firstRiskDay?.date ?? null,
          firstRiskBalance: snapshot.firstRiskDay?.balance ?? null,
          negativeCrossingDate: snapshot.negativeCrossingDate ?? null,
        },
        summary: snapshot.firstRiskDay
          ? `Primeiro dia de risco: ${snapshot.firstRiskDay.date}.`
          : `Margem real: ${money(snapshot.marginReal)}.`,
        headline: snapshot.firstRiskDay
          ? `Saldo negativo previsto a ${snapshot.firstRiskDay.date}.`
          : snapshot.marginReal <= 0
            ? 'Já estás sem margem real este mês.'
            : 'Sem dia de risco nos próximos 30 dias.',
      };

    case 'debt_vs_save':
      return {
        intent,
        supported: true,
        facts: {
          totalDebt: snapshot.totalDebt,
          monthlyDebtPayments: snapshot.monthlyDebtPayments,
          marginReal: snapshot.marginReal,
        },
        summary: snapshot.debtVsSaveHint ?? `Dívida ${money(snapshot.totalDebt)}.`,
        headline:
          snapshot.debtVsSaveHint ??
          (snapshot.marginReal > 200 && snapshot.totalDebt > 0
            ? 'Com margem, amortizar dívida costuma poupar juros.'
            : 'Sem recomendação específica neste momento.'),
      };

    case 'monthly_overview':
      return {
        intent,
        supported: true,
        facts: {
          availableThisMonth: snapshot.availableThisMonth,
          marginReal: snapshot.marginReal,
          monthlyIncome: snapshot.monthlyIncome,
          monthlyExpenses: snapshot.monthlyExpenses,
          monthlyNet: snapshot.monthlyNet,
          balanceAt30Days: snapshot.balanceAt30Days ?? null,
        },
        summary: `Receitas ${money(snapshot.monthlyIncome)}, despesas ${money(snapshot.monthlyExpenses)}.`,
        headline:
          snapshot.monthlyNet >= 0
            ? `Positivo em ${money(snapshot.monthlyNet)} este mês.`
            : `Negativo em ${money(Math.abs(snapshot.monthlyNet))} este mês.`,
      };

    default:
      return {
        intent: 'unsupported',
        supported: false,
        facts: {},
        summary: 'Pergunta não suportada.',
        headline: 'Ainda não sei responder a esse tipo de pergunta.',
      };
  }
}

export const SUPPORTED_INTENTS: AssistantIntent[] = [
  'daily_spend_limit',
  'can_i_buy',
  'when_runs_out',
  'debt_vs_save',
  'monthly_overview',
];

export function buildClassificationPrompt(message: string, history: Array<{ role: string; content: string }>): string {
  const historyText = history
    .slice(-6)
    .map((row) => `${row.role}: ${row.content}`)
    .join('\n');

  return `Classifica a pergunta do utilizador numa destas intenções EXACTAS:
- daily_spend_limit (quanto posso gastar hoje / gasto diário seguro)
- can_i_buy (posso comprar X / gastar X numa compra)
- when_runs_out (quando fico sem margem / saldo negativo)
- debt_vs_save (pagar dívida ou poupar / amortizar ou objetivo)
- monthly_overview (como estou este mês / resumo financeiro)
- unsupported (qualquer outra coisa)

Histórico recente:
${historyText || '(vazio)'}

Pergunta actual: "${message}"

Responde APENAS com JSON válido (sem markdown):
{"intent":"...","confidence":"high|medium|low","amount":null,"category":null,"reasoning":"..."}

Para can_i_buy extrai amount em euros (número). Para perguntas de seguimento como "e se fosse metade?" usa o histórico para inferir o valor base.`;
}

export function buildFormatPrompt(query: QueryResult): string {
  return `És o assistente financeiro CentFlow. Responde em português de Portugal, tom directo e honesto.

REGRAS OBRIGATÓRIAS:
- Usa APENAS os números dos FACTOS abaixo — NUNCA inventes, estimes ou recalcules valores.
- Se supported=false, diz claramente que ainda não sabes responder a esse tipo de pergunta.
- Máximo 3 frases curtas.
- Não menciones que és uma IA.

FACTOS CALCULADOS PELO MOTOR (fonte única de verdade):
${JSON.stringify(query.facts, null, 2)}

HEADLINE: ${query.headline}
RESUMO TÉCNICO: ${query.summary}

Escreve a resposta final para o utilizador:`;
}

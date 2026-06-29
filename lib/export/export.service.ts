import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type { CentFlowScoreResult } from '@/lib/domain/financial';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  formatCurrency,
  formatDateShort,
  formatPercent,
  getFormatContext,
} from '@/lib/utils/format';
import {
  DEFAULT_PDF_SECTIONS,
  normalizePdfSections,
  type PdfSectionSelection,
} from '@/lib/export/pdf-sections';

export type FinancialPdfInput = {
  dashboard?: DashboardData;
  profile?: FinancialProfileResult;
  centFlowScore?: CentFlowScoreResult;
  userName: string;
  transactions?: Transaction[];
  assets?: AssetsData;
  sections?: PdfSectionSelection;
};

export type UserDataExportPayload = {
  exportedAt: string;
  version: number;
  transactions: Transaction[];
  goals: AssetsData['goals'];
  warranties: AssetsData['warranties'];
  inventory: AssetsData['inventory'];
  credits: AssetsData['credits'];
  subscriptions: AssetsData['subscriptions'];
  centFlowScore?: CentFlowScoreResult;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildTransactionRows(transactions: Transaction[]): string {
  const recent = transactions.slice(0, 8);
  if (recent.length === 0) {
    return '<p class="muted">Sem movimentos registados.</p>';
  }

  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th class="col-desc">Descrição</th>
            <th class="col-cat">Categoria</th>
            <th class="col-date">Data</th>
            <th class="col-value align-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${recent
            .map((item) => {
              const prefix = item.type === 'income' ? '+' : '−';
              const tone = item.type === 'income' ? 'positive' : 'negative';
              const title = escapeHtml(item.description?.trim() || item.categoryLabel);
              return `
                <tr>
                  <td>${title}</td>
                  <td>${escapeHtml(item.categoryLabel)}</td>
                  <td>${escapeHtml(formatDateShort(item.date))}</td>
                  <td class="align-right ${tone}">${prefix}${escapeHtml(formatCurrency(item.amount, item.currency))}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildGoalsSection(assets?: AssetsData): string {
  const goals = assets?.goals ?? [];
  if (goals.length === 0) {
    return '<p class="muted">Sem objetivos definidos.</p>';
  }

  return `
    <div class="stack">
      ${goals
        .slice(0, 5)
        .map((goal) => {
          const percent = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          return `
            <div class="mini-card">
              <div class="mini-card-head">
                <strong>${escapeHtml(goal.name)}</strong>
                <span class="accent">${percent}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${Math.min(percent, 100)}%"></div>
              </div>
              <p class="muted">${escapeHtml(formatCurrency(goal.current))} de ${escapeHtml(formatCurrency(goal.target))}</p>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function buildAssetsSummary(assets?: AssetsData): string {
  const warranties = assets?.warranties.length ?? 0;
  const inventory = assets?.inventory.length ?? 0;
  const inventoryValue = (assets?.inventory ?? []).reduce((sum, item) => sum + item.value, 0);

  return `
    <div class="grid-2">
      <div class="stat-card">
        <span class="label">Garantias</span>
        <span class="stat-value">${warranties}</span>
      </div>
      <div class="stat-card">
        <span class="label">Inventário</span>
        <span class="stat-value">${inventory}</span>
      </div>
      <div class="stat-card wide">
        <span class="label">Valor do inventário</span>
        <span class="stat-value accent">${escapeHtml(formatCurrency(inventoryValue))}</span>
      </div>
    </div>
  `;
}

function levelProgressLabel(score: number): string {
  if (score >= 80) return 'Mestre';
  if (score >= 60) return 'Estratega';
  if (score >= 40) return 'Gestor';
  return 'Organizador';
}

function buildSubscriptionsSection(assets?: AssetsData): string {
  const subscriptions = assets?.subscriptions ?? [];
  if (subscriptions.length === 0) {
    return '<p class="muted">Sem subscrições registadas.</p>';
  }

  return `
    <div class="stack compact">
      ${subscriptions
        .slice(0, 12)
        .map(
          (sub) => `
            <div class="row-item">
              <span>${escapeHtml(sub.name)}</span>
              <strong>${escapeHtml(formatCurrency(sub.amount))}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function buildBreakdownRows(dashboard?: DashboardData): string {
  const breakdown = dashboard?.netWorth.breakdown;
  if (!breakdown) return '';

  const rows = [
    { label: 'Contas', value: breakdown.accounts },
    { label: 'Inventário', value: breakdown.inventory },
    { label: 'Investimentos', value: breakdown.investments },
    { label: 'Passivos', value: breakdown.liabilities },
  ];

  return `
    <div class="stack compact">
      ${rows
        .map(
          (row) => `
            <div class="row-item">
              <span>${row.label}</span>
              <strong class="${row.label === 'Passivos' ? 'negative' : 'accent'}">${escapeHtml(formatCurrency(row.value))}</strong>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function buildPdfHtml(input: FinancialPdfInput): string {
  const {
    dashboard,
    profile,
    centFlowScore,
    userName,
    transactions = [],
    assets,
    sections: rawSections,
  } = input;
  const sections = normalizePdfSections(rawSections ?? DEFAULT_PDF_SECTIONS);
  const { locale } = getFormatContext();
  const netWorth = formatCurrency(dashboard?.netWorth.netWorth ?? 0);
  const change = formatPercent(dashboard?.netWorthChangePercent ?? 0);
  const monthlyChange = formatCurrency(dashboard?.netWorthChangeThisMonth ?? 0);
  const weeklySpending = formatCurrency(dashboard?.weeklySpending ?? 0);
  const score = centFlowScore?.score ?? profile?.score ?? 0;
  const level = centFlowScore
    ? `${centFlowScore.bandLabel} · ${levelProgressLabel(centFlowScore.score)}`
    : profile?.levelLabel ?? '—';
  const date = new Date().toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  function section(title: string, body: string): string {
    return `
      <section class="section">
        <div class="section-head">
          <span class="section-accent"></span>
          <h2 class="section-title">${escapeHtml(title)}</h2>
        </div>
        <div class="section-body">${body}</div>
      </section>
    `;
  }

  const patrimonioBody = `
    <div class="hero-block">
      <span class="label">Património líquido</span>
      <div class="hero-value">${escapeHtml(netWorth)}</div>
    </div>
    <div class="grid-2">
      <div class="stat-card">
        <span class="label">Variação recente</span>
        <span class="stat-value accent">${escapeHtml(change)}</span>
      </div>
      <div class="stat-card">
        <span class="label">Este mês</span>
        <span class="stat-value">${escapeHtml(monthlyChange)}</span>
      </div>
      <div class="stat-card wide">
        <span class="label">Gastos da semana</span>
        <span class="stat-value">${escapeHtml(weeklySpending)}</span>
      </div>
    </div>
  `;

  const perfilBody = `
    <div class="grid-2">
      <div class="stat-card">
        <span class="label">CentFlow Score</span>
        <span class="stat-value accent">${score}/100</span>
      </div>
      <div class="stat-card">
        <span class="label">Nível</span>
        <span class="stat-value">${escapeHtml(level)}</span>
      </div>
    </div>
    ${centFlowScore ? `<p class="muted">${escapeHtml(centFlowScore.summary)}</p>` : ''}
  `;

  const sectionBlocks = [
    sections.patrimonio ? section('Património', patrimonioBody) : '',
    sections.composicao ? section('Composição', buildBreakdownRows(dashboard)) : '',
    sections.perfil ? section('Perfil financeiro', perfilBody) : '',
    sections.movimentos ? section('Movimentos recentes', buildTransactionRows(transactions)) : '',
    sections.objetivos ? section('Objetivos', buildGoalsSection(assets)) : '',
    sections.ativos ? section('Ativos', buildAssetsSummary(assets)) : '',
    sections.subscricoes ? section('Subscrições', buildSubscriptionsSection(assets)) : '',
  ].join('');

  return `
    <!DOCTYPE html>
    <html lang="pt" style="background-color:#05080E;color:#F8FAFC;">
      <head>
        <meta charset="utf-8" />
        <meta name="color-scheme" content="dark" />
        <style>
          :root {
            color-scheme: dark;
            --bg: #05080E;
            --surface: #101820;
            --surface-deep: #0A1214;
            --border: #1E2A33;
            --border-soft: #162029;
            --text: #F8FAFC;
            --text-secondary: #94A3B8;
            --text-muted: #64748B;
            --primary: #2DD4BF;
            --primary-dark: #14B8A6;
            --accent: #F0C14D;
            --danger: #F87171;
            --success: #34D399;
            --radius: 14px;
            --radius-sm: 10px;
          }

          @page {
            size: A4;
            margin: 18mm 14mm;
            background-color: #05080E;
          }

          @media print {
            html, body, .page-shell {
              background-color: #05080E !important;
              color: #F8FAFC !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          html,
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #F8FAFC;
            background-color: #05080E;
            margin: 0;
            padding: 0;
            line-height: 1.45;
          }

          .page-shell {
            background-color: #05080E;
            color: #F8FAFC;
            min-height: 100%;
            padding: 36px 32px 40px;
          }

          .page-header {
            border-bottom: 1px solid var(--border);
            padding-bottom: 22px;
            margin-bottom: 28px;
          }

          .brand {
            color: var(--primary);
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            font-weight: 700;
          }

          h1 {
            color: var(--text);
            font-size: 30px;
            font-weight: 700;
            margin: 10px 0 6px;
            letter-spacing: -0.02em;
          }

          .meta {
            color: var(--text-secondary);
            font-size: 13px;
          }

          .section {
            background-color: #101820;
            border: 1px solid #1E2A33;
            border-radius: var(--radius);
            margin-bottom: 18px;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .section-head {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px 0;
          }

          .section-accent {
            width: 4px;
            height: 18px;
            border-radius: 999px;
            background: linear-gradient(180deg, var(--primary), var(--primary-dark));
            flex-shrink: 0;
          }

          .section-title {
            color: var(--accent);
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 0;
            font-weight: 700;
          }

          .section-body {
            padding: 14px 20px 20px;
          }

          .hero-block {
            margin-bottom: 16px;
          }

          .hero-value {
            font-size: 36px;
            font-weight: 700;
            color: var(--primary);
            margin: 6px 0 0;
            letter-spacing: -0.02em;
          }

          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .stat-card,
          .mini-card {
            background-color: #0A1214;
            border: 1px solid #1E2A33;
            border-radius: var(--radius-sm);
            padding: 14px 16px;
          }

          .stat-card.wide { grid-column: 1 / -1; }

          .label {
            display: block;
            color: var(--text-secondary);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
            font-weight: 600;
          }

          .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: var(--text);
          }

          .accent { color: var(--primary); }
          .negative { color: var(--danger); }
          .positive { color: var(--success); }

          .row-item,
          .mini-card-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }

          .row-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--border-soft);
            font-size: 14px;
          }

          .row-item:last-child { border-bottom: none; }
          .row-item span { color: var(--text-secondary); }

          .stack { display: grid; gap: 12px; }
          .stack.compact { gap: 0; }

          .muted {
            color: var(--text-muted);
            font-size: 13px;
            margin: 0;
          }

          .table-wrap {
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            overflow: hidden;
            background: var(--surface-deep);
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            table-layout: fixed;
          }

          .table thead {
            background: rgba(45, 212, 191, 0.08);
          }

          .table th {
            text-align: left;
            color: var(--text-secondary);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            font-weight: 700;
          }

          .table th.col-desc { width: 34%; }
          .table th.col-cat { width: 24%; }
          .table th.col-date { width: 18%; }
          .table th.col-value { width: 24%; }

          .table td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--border-soft);
            vertical-align: middle;
            color: var(--text);
            word-wrap: break-word;
          }

          .table tbody tr:last-child td { border-bottom: none; }
          .table tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.015); }

          .align-right { text-align: right; }

          .progress-track {
            height: 8px;
            background: var(--border-soft);
            border-radius: 999px;
            overflow: hidden;
            margin: 10px 0 8px;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-dark), var(--primary));
            border-radius: 999px;
          }

          .footer {
            margin-top: 8px;
            padding: 16px 18px;
            border: 1px solid #1E2A33;
            border-radius: var(--radius-sm);
            background-color: #101820;
            color: #64748B;
            font-size: 11px;
            line-height: 1.6;
            text-align: center;
          }
        </style>
      </head>
      <body style="background-color:#05080E;color:#F8FAFC;margin:0;padding:0;">
        <div class="page-shell" style="background-color:#05080E;color:#F8FAFC;">
        <header class="page-header">
          <div class="brand">CentFlow</div>
          <h1>Relatório Financeiro</h1>
          <div class="meta">${escapeHtml(userName)} · ${escapeHtml(date)}</div>
        </header>

        ${sectionBlocks}

        <p class="footer">
          Relatório gerado pela CentFlow · Design dark premium<br />
          Os valores refletem os dados disponíveis no momento da exportação.
        </p>
        </div>
      </body>
    </html>
  `;
}

export async function exportFinancialPdf(input: FinancialPdfInput): Promise<void> {
  const html = buildPdfHtml({
    ...input,
    sections: normalizePdfSections(input.sections ?? DEFAULT_PDF_SECTIONS),
  });
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'CentFlow — Relatório PDF',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  throw new Error('Partilha não disponível neste dispositivo.');
}

export async function exportUserDataJson(payload: UserDataExportPayload): Promise<void> {
  const filePayload = {
    exportedAt: payload.exportedAt ?? new Date().toISOString(),
    version: payload.version ?? 2,
    transactions: payload.transactions,
    goals: payload.goals,
    warranties: payload.warranties,
    inventory: payload.inventory,
    credits: payload.credits,
    subscriptions: payload.subscriptions,
    centFlowScore: payload.centFlowScore,
  };

  const fileName = `centflow-export-${Date.now()}.json`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('Armazenamento local indisponível.');
  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(filePayload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'CentFlow — Exportação JSON',
    });
    return;
  }

  throw new Error('Partilha não disponível neste dispositivo.');
}

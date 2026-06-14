import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import {
  formatCurrency,
  formatDateShort,
  formatPercent,
  getFormatContext,
} from '@/lib/utils/format';

export type FinancialPdfInput = {
  dashboard?: DashboardData;
  profile?: FinancialProfileResult;
  userName: string;
  transactions?: Transaction[];
  assets?: AssetsData;
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
    <table class="table">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Data</th>
          <th class="align-right">Valor</th>
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
  const { dashboard, profile, userName, transactions = [], assets } = input;
  const { locale } = getFormatContext();
  const netWorth = formatCurrency(dashboard?.netWorth.netWorth ?? 0);
  const change = formatPercent(dashboard?.netWorthChangePercent ?? 0);
  const monthlyChange = formatCurrency(dashboard?.netWorthChangeThisMonth ?? 0);
  const weeklySpending = formatCurrency(dashboard?.weeklySpending ?? 0);
  const score = profile?.score ?? 0;
  const level = profile?.levelLabel ?? '—';
  const date = new Date().toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #F8FAFC;
            background: #05080E;
            margin: 0;
            padding: 32px;
          }
          .header {
            border-bottom: 1px solid #1E2A33;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .brand {
            color: #2DD4BF;
            font-size: 12px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            font-weight: 700;
          }
          h1 {
            color: #F8FAFC;
            font-size: 28px;
            margin: 8px 0 4px;
          }
          .meta { color: #94A3B8; font-size: 13px; }
          .section {
            background: #101820;
            border: 1px solid #1E2A33;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
          }
          .section-title {
            color: #F0C14D;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin: 0 0 14px;
            font-weight: 700;
          }
          .hero-value {
            font-size: 34px;
            font-weight: 700;
            color: #2DD4BF;
            margin: 4px 0 12px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .stat-card, .mini-card {
            background: #0A1214;
            border: 1px solid #1E2A33;
            border-radius: 12px;
            padding: 14px;
          }
          .stat-card.wide { grid-column: 1 / -1; }
          .label {
            display: block;
            color: #94A3B8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 6px;
          }
          .stat-value {
            font-size: 22px;
            font-weight: 700;
            color: #F8FAFC;
          }
          .accent { color: #2DD4BF; }
          .negative { color: #F87171; }
          .positive { color: #34D399; }
          .row-item, .mini-card-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .row-item {
            padding: 10px 0;
            border-bottom: 1px solid #1E2A33;
          }
          .row-item:last-child { border-bottom: none; }
          .stack { display: grid; gap: 12px; }
          .stack.compact { gap: 0; }
          .muted { color: #94A3B8; font-size: 13px; margin: 0; }
          .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .table th {
            text-align: left;
            color: #94A3B8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0 0 10px;
            border-bottom: 1px solid #1E2A33;
          }
          .table td {
            padding: 10px 8px 10px 0;
            border-bottom: 1px solid #162029;
            vertical-align: top;
          }
          .align-right { text-align: right; }
          .progress-track {
            height: 8px;
            background: #162029;
            border-radius: 999px;
            overflow: hidden;
            margin: 8px 0;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #0F766E, #2DD4BF);
            border-radius: 999px;
          }
          .footer {
            margin-top: 28px;
            color: #64748B;
            font-size: 11px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">CentFlow</div>
          <h1>Relatório Financeiro</h1>
          <div class="meta">${escapeHtml(userName)} · ${escapeHtml(date)}</div>
        </div>

        <div class="section">
          <p class="section-title">Património</p>
          <span class="label">Património líquido</span>
          <div class="hero-value">${escapeHtml(netWorth)}</div>
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
        </div>

        <div class="section">
          <p class="section-title">Composição</p>
          ${buildBreakdownRows(dashboard)}
        </div>

        <div class="section">
          <p class="section-title">Perfil financeiro</p>
          <div class="grid-2">
            <div class="stat-card">
              <span class="label">Pontuação</span>
              <span class="stat-value accent">${score}%</span>
            </div>
            <div class="stat-card">
              <span class="label">Nível</span>
              <span class="stat-value">${escapeHtml(level)}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <p class="section-title">Movimentos recentes</p>
          ${buildTransactionRows(transactions)}
        </div>

        <div class="section">
          <p class="section-title">Objectivos</p>
          ${buildGoalsSection(assets)}
        </div>

        <div class="section">
          <p class="section-title">Ativos</p>
          ${buildAssetsSummary(assets)}
        </div>

        <p class="footer">
          Relatório gerado pela CentFlow. Os valores reflectem os dados disponíveis no momento da exportação.
        </p>
      </body>
    </html>
  `;
}

export async function exportFinancialPdf(input: FinancialPdfInput): Promise<void> {
  const html = buildPdfHtml(input);
  const { uri } = await Print.printToFileAsync({ html });

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

export async function exportUserDataJson(
  transactions: Transaction[],
  assets: AssetsData,
): Promise<void> {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    transactions,
    goals: assets.goals,
    warranties: assets.warranties,
    inventory: assets.inventory,
  };

  const fileName = `centflow-export-${Date.now()}.json`;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('Armazenamento local indisponível.');
  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'CentFlow — Exportação JSON',
    });
    return;
  }

  throw new Error('Partilha não disponível neste dispositivo.');
}

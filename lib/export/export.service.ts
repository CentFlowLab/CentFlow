import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

function buildPdfHtml(
  dashboard: DashboardData | undefined,
  profile: FinancialProfileResult | undefined,
  userName: string,
): string {
  const netWorth = formatCurrency(dashboard?.netWorth.netWorth ?? 0);
  const change = formatPercent(dashboard?.netWorthChangePercent ?? 0);
  const score = profile?.score ?? 0;
  const level = profile?.levelLabel ?? '—';
  const date = new Date().toLocaleDateString('pt-PT');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, sans-serif; color: #111; padding: 32px; }
          h1 { color: #0A1214; font-size: 24px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
          .label { color: #666; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 28px; font-weight: 700; color: #0F766E; margin-top: 4px; }
          .row { display: flex; justify-content: space-between; margin-top: 12px; }
        </style>
      </head>
      <body>
        <h1>CentFlow — Relatório Financeiro</h1>
        <div class="meta">${userName} · ${date}</div>
        <div class="card">
          <div class="label">Património líquido</div>
          <div class="value">${netWorth}</div>
          <div class="row">
            <span>Variação recente</span>
            <strong>${change}</strong>
          </div>
        </div>
        <div class="card">
          <div class="label">Perfil financeiro</div>
          <div class="value" style="font-size:22px">${score}%</div>
          <div class="row">
            <span>Nível</span>
            <strong>${level}</strong>
          </div>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px">
          Relatório gerado pela CentFlow. Os valores reflectem os dados disponíveis no momento da exportação.
        </p>
      </body>
    </html>
  `;
}

export async function exportFinancialPdf(
  dashboard: DashboardData | undefined,
  profile: FinancialProfileResult | undefined,
  userName: string,
): Promise<void> {
  const html = buildPdfHtml(dashboard, profile, userName);
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

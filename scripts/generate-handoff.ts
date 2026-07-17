/**
 * Gera HANDOFF.md automaticamente a partir do estado atual do projeto.
 * Executar: npm run handoff
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUTH_ENDPOINTS } from '../lib/auth/constants';
import { buildHandoffDashboardMetrics } from './handoff-metrics';
import { formatCurrency, formatPercent } from '../lib/utils/format';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'scripts', 'handoff.config.json');

type HandoffConfig = {
  projectName: string;
  tagline: string;
  currentPhase: string;
  completed: string[];
  pending: string[];
  outputFile: string;
};

type TreeEntry = { path: string; type: 'file' | 'dir' };

const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'scripts'] as const;
const IGNORE = new Set(['node_modules', '.git', '.expo', 'assets']);

function loadConfig(): HandoffConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as HandoffConfig;
}

function loadPackageJson() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'),
  ) as Record<string, unknown>;
}

function walkDir(dir: string, base = ''): TreeEntry[] {
  const entries: TreeEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  for (const name of fs.readdirSync(dir).sort()) {
    if (IGNORE.has(name)) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      entries.push({ path: rel, type: 'dir' });
      entries.push(...walkDir(full, rel));
    } else if (/\.(tsx?|json)$/.test(name) && !name.endsWith('.lock')) {
      entries.push({ path: rel, type: 'file' });
    }
  }
  return entries;
}

function buildFileTree(): string {
  const lines: string[] = [];
  for (const dir of SCAN_DIRS) {
    const entries = walkDir(path.join(ROOT, dir), dir);
    for (const entry of entries) {
      const indent = '  '.repeat(entry.path.split('/').length - 1);
      const suffix = entry.type === 'dir' ? '/' : '';
      lines.push(`${indent}${entry.path.split('/').pop()}${suffix}`);
    }
  }
  return lines.join('\n');
}

function getGitInfo(): { hash: string; date: string } | null {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim();
    const date = execSync('git log -1 --format=%cI', {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim();
    return { hash, date };
  } catch {
    return null;
  }
}

function listScreens(): string[] {
  const tabsDir = path.join(ROOT, 'app', '(tabs)');
  if (!fs.existsSync(tabsDir)) return [];
  return fs
    .readdirSync(tabsDir)
    .filter((f: string) => f.endsWith('.tsx') && f !== '_layout.tsx')
    .map((f: string) => f.replace('.tsx', ''));
}

function listDomainExports(): string[] {
  const servicePath = path.join(ROOT, 'lib', 'domain', 'net-worth.service.ts');
  if (!fs.existsSync(servicePath)) return [];
  const content = fs.readFileSync(servicePath, 'utf-8');
  return [...content.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
}

function generate(config: HandoffConfig): string {
  const pkg = loadPackageJson();
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const dashboard = buildHandoffDashboardMetrics();
  const { netWorth } = dashboard;
  const git = getGitInfo();
  const now = new Date().toISOString();
  const screens = listScreens();
  const domainFns = listDomainExports();

  const stack = [
    `Expo ${deps.expo ?? '?'}`,
    `Expo Router ${deps['expo-router'] ?? '?'}`,
    `React ${deps.react ?? '?'}`,
    `React Native ${deps['react-native'] ?? '?'}`,
    `TanStack Query ${deps['@tanstack/react-query'] ?? '?'}`,
    'TypeScript',
  ].join(' · ');

  return `<!-- ⚠️ AUTO-GENERATED — não editar manualmente -->
<!-- Gerado por: npm run handoff -->
<!-- Última geração: ${now} -->
${git ? `<!-- Git: ${git.hash} (${git.date}) -->\n` : ''}
# ${config.projectName} Mobile — Handoff

> **${config.tagline}** — Documento vivo para partilha com outros agents (Grok, Claude, etc.)
>
> Este ficheiro é **gerado automaticamente**. Para alterar conteúdo curado (fases, pendências),
> edita \`scripts/handoff.config.json\` e corre \`npm run handoff\`.

---

## Meta

| Campo | Valor |
|-------|-------|
| Fase atual | **${config.currentPhase}** |
| Última geração | ${now} |
| Path do projeto | \`${ROOT}\` |
${git ? `| Git commit | \`${git.hash}\` (${git.date}) |` : '| Git commit | _(não disponível)_ |'}

---

## Stack

${stack}

**Comandos:**
\`\`\`bash
cd centflow
npm start
npm run handoff    # regenerar este ficheiro
npx tsc --noEmit   # validar TypeScript
\`\`\`

---

## Património Líquido (calculado dos mocks atuais)

\`\`\`
Total Ativos     = Contas + Inventário + Investimentos
Total Passivos   = Créditos em dívida
Património Líq.  = Total Ativos − Total Passivos
\`\`\`

| Métrica | Valor |
|---------|-------|
| Contas | ${formatCurrency(netWorth.breakdown.accounts)} |
| Inventário | ${formatCurrency(netWorth.breakdown.inventory)} |
| Investimentos | ${formatCurrency(netWorth.breakdown.investments)} |
| **Total Ativos** | **${formatCurrency(netWorth.totalAssets)}** |
| Passivos (créditos) | ${formatCurrency(netWorth.totalLiabilities)} |
| **Património Líquido** | **${formatCurrency(netWorth.netWorth)}** |
| Mês anterior | ${formatCurrency(dashboard.previousMonthNetWorth)} |
| Variação | ${formatPercent(dashboard.netWorthChangePercent)} |
| Gastos esta semana | ${formatCurrency(dashboard.weeklySpending)} |
| Alertas ativos | ${dashboard.attentionItems.length} |
| Sugestões | ${dashboard.suggestions.length} |

### Regras de investimentos recorrentes (correção vs. web)
- Usa \`currentValue\` (valor de mercado), não \`appliedAmount\`
- Inclui: regra ativa OU \`appliedAmount > 0\`
- Não projeta contribuições futuras
- Não duplica saldos de conta com investimentos

### Funções de domínio (\`lib/domain/net-worth.service.ts\`)
${domainFns.map((fn) => `- \`${fn}()\``).join('\n')}

### Breakdown para donut (\`assetsByCategory\`)
${netWorth.assetsByCategory.map((c) => `- ${c.label}: ${formatCurrency(c.value)}`).join('\n')}

---

## Navegação — 5 abas

| Aba | Ficheiro | Estado |
|-----|----------|--------|
| Início | \`app/(tabs)/index.tsx\` | ✅ Dashboard Fase 1 |
| Movimentos | \`app/(tabs)/movimentos.tsx\` | 🔲 Empty state |
| Análises | \`app/(tabs)/analises.tsx\` | 🔲 Empty state (destaque visual na tab bar) |
| Ativos | \`app/(tabs)/ativos.tsx\` | 🔲 Sub-nav + empty states |
| Perfil | \`app/(tabs)/perfil.tsx\` | 🔲 Menu estático |

Ecrãs detetados: ${screens.map((s) => `\`${s}\``).join(', ')}

---

## Autenticação (Fase 2)

| Funcionalidade | Estado |
|----------------|--------|
| Login | ✅ \`app/(auth)/login.tsx\` |
| Registo | ✅ \`app/(auth)/register.tsx\` |
| Recuperar password | ✅ \`app/(auth)/forgot-password.tsx\` |
| Sessão persistente | ✅ expo-secure-store |
| Rotas protegidas | ✅ Stack.Protected em \`app/_layout.tsx\` |
| Logout | ✅ Botão no Perfil |

### Endpoints (ajustar em \`lib/auth/constants.ts\` se necessário)
${Object.entries(AUTH_ENDPOINTS).map(([k, v]) => `- \`${k}\`: \`${v}\``).join('\n')}

### Arquitetura auth
\`\`\`
lib/auth/
├── auth.service.ts    # login, register, logout, restoreSession
├── auth.context.tsx   # AuthProvider + estado global
├── useAuth.ts         # hook de conveniência
├── storage.ts         # SecureStore (token)
├── schemas.ts         # validação Zod
├── errors.ts          # mensagens amigáveis
└── types.ts
\`\`\`

Token enviado automaticamente via \`Authorization: Bearer\` em \`apiFetch\`.

---

## Estrutura de ficheiros

\`\`\`
${buildFileTree()}
\`\`\`

---

## Fase atual: ${config.currentPhase}

### ✅ Concluído
${config.completed.map((item) => `- ${item}`).join('\n')}

### 🔲 Pendente
${config.pending.map((item) => `- ${item}`).join('\n')}

---

## Arquitetura

\`\`\`
UI          → app/(tabs)/*.tsx + components/**
Domínio     → lib/domain/ (cálculos de património)
Dados       → lib/data/mocks.ts + hooks/queries/
API (futuro)→ lib/api/client.ts + mappers
Tema        → lib/theme/
\`\`\`

### Dashboard — secções do ecrã Início
1. **Saudação** — "Olá, [Nome]" + data + avatar → Perfil
2. **Onde estou?** — Património líquido, cor dinâmica, variação %, botão → Análises
3. **O que mudou?** — Gastos semana / evolução património / inflação pessoal
4. **O que precisa da minha atenção?** — Garantias, créditos, subscrições
5. **O que devo fazer?** — Sugestões inteligentes

### Design system (cores principais)
- Background: \`#080C12\`
- Surface: \`#121820\`
- Primary (teal): \`#2DD4BF\`
- Accent (gold): \`#F5C451\`
- Success: \`#34D399\` · Danger: \`#F87171\`

---

## Integração API (futuro)

\`\`\`typescript
// hooks/queries/useDashboardData.ts
const raw = await apiFetch<DashboardRaw>('/dashboard');
return mapToDashboard(raw); // usa calculateNetWorth() no mapper
\`\`\`

Variável: \`EXPO_PUBLIC_API_URL\` (ver \`.env.example\`)

---

## Atualização automática

Este ficheiro regenera-se automaticamente quando:
1. **Cursor hook** \`afterFileEdit\` deteta alterações em \`app/\`, \`lib/\`, \`components/\`, \`hooks/\`
2. Corres \`npm run handoff\` manualmente
3. O agent Cursor segue a regra em \`.cursor/rules/handoff-sync.mdc\`

Para atualizar fases/pendências manualmente: edita \`scripts/handoff.config.json\`.
`;
}

function main() {
  const config = loadConfig();
  const outputPath = path.join(ROOT, config.outputFile);
  const content = generate(config);
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✓ Handoff gerado: ${outputPath}`);
}

main();

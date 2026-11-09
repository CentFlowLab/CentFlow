/**
 * @jest-environment node
 */
/**
 * Ensaio real contra o Supabase alojado. Não corre no `npm run check`: só com MIVEN_LIVE_URL,
 * MIVEN_LIVE_PUBLISHABLE_KEY e MIVEN_LIVE_SECRET_KEY definidas na shell. Por omissão só aceita o
 * staging; a produção exige também MIVEN_LIVE_CONFIRM=CONFIRMO-PRODUCAO.
 * A chave secreta só cria e apaga o utilizador de teste; a sincronização usa a sessão dele (RLS).
 * Nunca escrever estas chaves em ficheiros do repositório.
 */
import { randomUUID } from 'node:crypto';
import https from 'node:https';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createLocalStore, createSyncEngine } from '@/data/sync';
import { createSupabaseTransport } from '@/data/sync/supabase-transport';
import { openTestDatabase, testId } from '@/test-utils/node-sqlite-driver';

import {
  assertProductionTarget,
  PRODUCTION_CONFIRMATION,
  PRODUCTION_PROJECT_REF,
} from '../../../../scripts/production-target';
import { assertStagingTarget } from '../../../../scripts/staging-target';

const url = process.env.MIVEN_LIVE_URL ?? '';
const publishableKey = process.env.MIVEN_LIVE_PUBLISHABLE_KEY ?? '';
const secretKey = process.env.MIVEN_LIVE_SECRET_KEY ?? '';

/** Staging sem mais; produção só com a confirmação explícita na shell. */
function assertLiveTarget(target: string): void {
  if (target.includes(PRODUCTION_PROJECT_REF)) {
    if (process.env.MIVEN_LIVE_CONFIRM !== PRODUCTION_CONFIRMATION) {
      throw new Error('Produção recusada: falta MIVEN_LIVE_CONFIRM.');
    }
    assertProductionTarget(`${target} ${PRODUCTION_CONFIRMATION}`);
    return;
  }
  assertStagingTarget(target);
}
const enabled = url !== '' && publishableKey !== '' && secretKey !== '';

const describeLive = enabled ? describe : describe.skip;

jest.setTimeout(120_000);

const noStorage = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
function decodeChunks(chunks: readonly Uint8Array[]): string {
  const total = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    total.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(total);
}

// O preset jest-expo troca o `fetch` global pelo `expo/fetch` (stub sem rede). Aqui é preciso
// rede real, por isso um adaptador mínimo sobre `node:https`, só com o que o supabase-js usa.
const nodeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const headers: Record<string, string> = {};
  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value;
  });
  const body = typeof init.body === 'string' ? init.body : undefined;
  const { status, statusText, responseHeaders, text } = await new Promise<{
    status: number;
    statusText: string;
    responseHeaders: Headers;
    text: string;
  }>((resolve, reject) => {
    const request = https.request(target, { method: init.method ?? 'GET', headers }, (response) => {
      const chunks: Uint8Array[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const result = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (typeof value === 'string') result.set(key, value);
        }
        resolve({
          status: response.statusCode ?? 0,
          statusText: response.statusMessage ?? '',
          responseHeaders: result,
          text: decodeChunks(chunks),
        });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: responseHeaders,
    url: target.toString(),
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  } as Response;
}) as typeof fetch;
const options = { auth: noStorage, global: { fetch: nodeFetch } };

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url, publishableKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${error.code ?? error.status}`);
  return client;
}

async function liveDevice(client: SupabaseClient, userId: string) {
  const db = await openTestDatabase();
  const local = createLocalStore(db, { newId: testId });
  await local.sync.enableTracking(userId);
  const engine = createSyncEngine({
    store: local.sync,
    transport: createSupabaseTransport(client),
  });
  return { ...local, engine, close: () => db.close() };
}

describeLive('sincronização real: movimentos, Património, Veículos e Documentos', () => {
  let admin: SupabaseClient;
  let userId = '';
  const email = `miven-ensaio-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;

  beforeAll(async () => {
    assertLiveTarget(url);
    admin = createClient(url, secretKey, options);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user)
      throw new Error(`createUser failed: ${error?.code ?? error?.name ?? 'unknown'}`);
    userId = data.user.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it('cria, edita e elimina num dispositivo e o outro recebe', async () => {
    const a = await liveDevice(await signedInClient(email, password), userId);
    const b = await liveDevice(await signedInClient(email, password), userId);
    try {
      const bank = await a.repositories.accounts.create({
        name: 'Banco',
        type: 'bank',
        currency: 'EUR',
        initialBalance: 10_000,
      });
      const salary = await a.repositories.categories.create({
        name: 'Salário',
        type: 'income',
        icon: 'briefcase-outline',
        color: 'green',
      });
      const entry = await a.repositories.entries.create({
        type: 'income',
        amount: 2_350,
        description: 'Ensaio',
        categoryId: salary.id,
        accountId: bank.id,
        destinationAccountId: null,
        date: '2026-11-09',
        notes: null,
      });
      const item = await a.repositories.wealth.create({
        name: 'Casa',
        type: 'property',
        amount: 25_000_000,
        currency: 'EUR',
        valuedOn: '2026-11-01',
      });
      const car = await a.repositories.vehicles.create({
        name: 'Carro',
        kind: 'car',
        plate: 'AA-00-AA',
        odometerKm: 120_000,
        inspectionDue: '2027-03-01',
        insuranceDue: null,
      });
      const doc = await a.repositories.documents.create({
        title: 'Cartão de Cidadão',
        category: 'identity',
        expiresOn: '2030-01-01',
        notes: '',
      });
      expect((await a.engine.sync()).status).toBe('idle');
      expect((await b.engine.sync()).status).toBe('idle');

      expect(await b.repositories.entries.get(entry.id)).toMatchObject({ amount: 2_350 });
      const [received] = await b.repositories.accounts.listWithBalances();
      expect(received).toMatchObject({ id: bank.id, balance: 12_350 });
      expect(await b.repositories.wealth.get(item.id)).toMatchObject({ amount: 25_000_000 });
      expect(await b.repositories.vehicles.get(car.id)).toMatchObject({ plate: 'AA-00-AA' });
      expect(await b.repositories.documents.get(doc.id)).toMatchObject({ category: 'identity' });

      // Edita no B, recebe no A.
      await b.repositories.wealth.update(item.id, {
        name: 'Casa',
        type: 'property',
        amount: 26_000_000,
        currency: 'EUR',
        valuedOn: '2026-11-09',
      });
      await b.repositories.vehicles.update(car.id, {
        name: 'Carro',
        kind: 'car',
        plate: 'AA-00-AA',
        odometerKm: 121_500,
        inspectionDue: '2027-03-01',
        insuranceDue: '2027-01-15',
      });
      await b.repositories.documents.update(doc.id, {
        title: 'Cartão de Cidadão',
        category: 'identity',
        expiresOn: '2031-01-01',
        notes: 'renovado',
      });
      expect((await b.engine.sync()).status).toBe('idle');
      expect((await a.engine.sync()).status).toBe('idle');
      expect(await a.repositories.wealth.get(item.id)).toMatchObject({ amount: 26_000_000 });
      expect(await a.repositories.vehicles.get(car.id)).toMatchObject({
        odometerKm: 121_500,
        insuranceDue: '2027-01-15',
      });
      expect(await a.repositories.documents.get(doc.id)).toMatchObject({
        expiresOn: '2031-01-01',
        notes: 'renovado',
      });

      // Elimina no A, desaparece no B.
      await a.repositories.wealth.delete(item.id);
      await a.repositories.vehicles.delete(car.id);
      await a.repositories.documents.delete(doc.id);
      expect((await a.engine.sync()).status).toBe('idle');
      expect((await b.engine.sync()).status).toBe('idle');
      expect(await b.repositories.wealth.list()).toEqual([]);
      expect(await b.repositories.vehicles.list()).toEqual([]);
      expect(await b.repositories.documents.list()).toEqual([]);
      expect((await b.engine.sync()).pending).toBe(0);
    } finally {
      await a.close();
      await b.close();
    }
  });
});

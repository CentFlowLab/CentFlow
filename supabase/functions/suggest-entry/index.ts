// Registo por linguagem natural. A chave do fornecedor de IA existe só neste ambiente de servidor
// (segredo ANTHROPIC_API_KEY). Devolve uma proposta; nunca grava nada na base de dados.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { deleteAccountCorsHeaders } from '../../../src/core/account/delete-account-policy.ts';
import {
  buildSuggestionPrompt,
  extractJsonObject,
  normalizeSuggestionText,
  parseSuggestion,
  type SuggestionContext,
} from '../../../src/core/ai/suggest-entry.ts';

const MODEL = Deno.env.get('SUGGEST_ENTRY_MODEL') ?? 'claude-haiku-5-5';
const TIMEOUT_MS = 15_000;

function extraOrigins(): string[] {
  return (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseContext(value: unknown): SuggestionContext | null {
  if (typeof value !== 'object' || value === null) return null;
  const { today, categories } = value as { today?: unknown; categories?: unknown };
  if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  if (!Array.isArray(categories) || categories.length > 100) return null;
  const clean: SuggestionContext['categories'][number][] = [];
  for (const item of categories) {
    const { name, type } = (item ?? {}) as { name?: unknown; type?: unknown };
    if (typeof name !== 'string' || name.length > 60) return null;
    if (type !== 'expense' && type !== 'income') return null;
    clean.push({ name, type });
  }
  return { today, categories: clean };
}

Deno.serve(async (req) => {
  const headers = deleteAccountCorsHeaders(req.headers.get('Origin'), extraOrigins());
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!url || !publishable) return json({ error: 'misconfigured' }, 500);
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  const caller = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  type RequestBody = { text?: unknown; context?: unknown } | null;
  let body: RequestBody = null;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }
  const text = normalizeSuggestionText(body?.text);
  const context = parseContext(body?.context);
  if (!text || !context) return json({ error: 'invalid_request' }, 400);

  const prompt = buildSuggestionPrompt(text, context);
  let reply: string;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        // Os modelos atuais recusam `temperature` (400). Extração curta: sem raciocínio, para
        // os tokens de saída irem para a resposta. `disabled` é aceite com o esforço por omissão.
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return json({ error: 'upstream_failed' }, 502);
    const data = (await response.json()) as {
      stop_reason?: string;
      content?: { type: string; text?: string }[];
    };
    if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') {
      return json({ error: 'not_understood' }, 422);
    }
    reply = data.content?.find((block) => block.type === 'text')?.text ?? '';
  } catch {
    return json({ error: 'upstream_failed' }, 502);
  }

  const suggestion = parseSuggestion(extractJsonObject(reply), context);
  if (!suggestion) return json({ error: 'not_understood' }, 422);
  // Sem registar o texto do utilizador nem a resposta (privacidade).
  return json({ suggestion });
});

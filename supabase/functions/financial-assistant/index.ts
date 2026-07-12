import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { callAnthropic, parseJsonFromText } from '../_shared/financial-assistant/anthropic.ts';
import {
  buildClassificationPrompt,
  buildFormatPrompt,
  executeAssistantQueryPorted,
  SUPPORTED_INTENTS,
  type AssistantIntent,
  type MotorSnapshot,
  type QueryResult,
} from '../_shared/financial-assistant/queries.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  message: string;
  conversationId?: string;
  snapshot: MotorSnapshot;
  /** Resultado pré-calculado pelo motor no client (simulateDecision, etc.) */
  motorQueryResult?: QueryResult;
};

type ClassificationJson = {
  intent?: string;
  confidence?: string;
  amount?: number | null;
  category?: string | null;
  reasoning?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function resolveIntent(raw?: string): AssistantIntent {
  if (raw && SUPPORTED_INTENTS.includes(raw as AssistantIntent)) {
    return raw as AssistantIntent;
  }
  return 'unsupported';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return jsonResponse({ error: 'Assistente indisponível (configuração).' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Não autenticado.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as RequestBody;
    const message = body.message?.trim();
    if (!message) {
      return jsonResponse({ error: 'Mensagem vazia.' }, 400);
    }
    if (!body.snapshot) {
      return jsonResponse({ error: 'Snapshot financeiro em falta.' }, 400);
    }

    let conversationId = body.conversationId;

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from('assistant_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 80) })
        .select('id')
        .single();
      if (createError || !created) {
        return jsonResponse({ error: 'Não foi possível criar conversa.' }, 500);
      }
      conversationId = created.id;
    }

    const { data: historyRows } = await supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(12);

    const history = (historyRows ?? []).map((row) => ({
      role: row.role as string,
      content: row.content as string,
    }));

    await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: message,
    });

    const classifyRaw = await callAnthropic({
      apiKey: anthropicKey,
      system:
        'Classificador de intenções financeiras. Responde só JSON. Nunca calcules valores financeiros.',
      user: buildClassificationPrompt(message, history),
      maxTokens: 256,
    });

    const classification = parseJsonFromText<ClassificationJson>(classifyRaw);
    const intent = resolveIntent(classification?.intent);
    const params = {
      amount: typeof classification?.amount === 'number' ? classification.amount : undefined,
      category: classification?.category ?? undefined,
    };

    let queryResult: QueryResult;

    if (
      body.motorQueryResult &&
      body.motorQueryResult.intent === intent &&
      body.motorQueryResult.supported
    ) {
      queryResult = body.motorQueryResult;
    } else {
      queryResult = executeAssistantQueryPorted(intent, params, body.snapshot);
    }

    let answer: string;

    if (!queryResult.supported || intent === 'unsupported') {
      answer =
        'Ainda não sei responder a esse tipo de pergunta. Experimenta perguntar sobre quanto podes gastar hoje, se podes fazer uma compra, quando ficas sem margem, ou se deves pagar dívida ou poupar.';
    } else {
      answer = await callAnthropic({
        apiKey: anthropicKey,
        system:
          'Formatador de respostas financeiras CentFlow. Usa apenas os factos fornecidos. Português de Portugal.',
        user: buildFormatPrompt(queryResult),
        maxTokens: 400,
      });
    }

    await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'assistant',
      content: answer,
      intent,
    });

    await supabase
      .from('assistant_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return jsonResponse({
      conversationId,
      intent,
      supported: queryResult.supported,
      answer,
      facts: queryResult.facts,
      headline: queryResult.headline,
    });
  } catch (error) {
    console.error('financial-assistant error', error instanceof Error ? error.message : 'unknown');
    return jsonResponse({ error: 'Erro ao processar a pergunta.' }, 500);
  }
});

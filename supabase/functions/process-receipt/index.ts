import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OcrItem = {
  name: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
};

type OcrPayload = {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  suggestedCategory?: string;
  confidence?: number;
  rawText?: string;
  items?: OcrItem[];
  source: 'mock' | 'google_vision';
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Parser mínimo PT — substituir/expandir com Google Vision em produção */
function parseReceiptText(rawText: string): OcrPayload {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const merchantName = lines[0] ?? 'Comerciante';

  const totalMatch = rawText.match(/(?:total|importe|valor)\s*[:\s]*(\d+[.,]\d{2})/i);
  const totalAmount = totalMatch
    ? Number(totalMatch[1].replace(',', '.'))
    : undefined;

  const dateMatch = rawText.match(/(\d{2}[./-]\d{2}[./-]\d{2,4})/);
  const date = dateMatch?.[1];

  const upper = rawText.toUpperCase();
  let suggestedCategory = 'other';
  if (/LIDL|CONTINENTE|PINGO|AUCHAN|MINIPREÇO|ALDI/.test(upper)) {
    suggestedCategory = 'food';
  }

  return {
    merchantName,
    totalAmount,
    date,
    suggestedCategory,
    confidence: rawText.length > 20 ? 0.65 : 0.35,
    rawText,
    items: [],
    source: 'mock',
  };
}

async function runGoogleVision(
  imageBase64: string,
  apiKey: string,
): Promise<OcrPayload | null> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            imageContext: { languageHints: ['pt', 'en'] },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    console.error('Google Vision error', await response.text());
    return null;
  }

  const data = await response.json();
  const rawText =
    data?.responses?.[0]?.fullTextAnnotation?.text ??
    data?.responses?.[0]?.textAnnotations?.[0]?.description ??
    '';

  if (!rawText) return null;

  const parsed = parseReceiptText(rawText);
  return { ...parsed, source: 'google_vision', confidence: 0.82 };
}

function mockOcrResult(): OcrPayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    merchantName: 'Lidl',
    totalAmount: 23.45,
    date: today,
    suggestedCategory: 'food',
    confidence: 0.5,
    rawText: 'LIDL\nTotal 23,45\n' + today,
    items: [],
    source: 'mock',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const { receiptId } = await req.json();
    if (!receiptId || typeof receiptId !== 'string') {
      return jsonResponse({ error: 'receiptId is required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleVisionKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: receipt, error: receiptError } = await admin
      .from('receipts')
      .select('id, user_id, storage_path, mime_type, status')
      .eq('id', receiptId)
      .eq('user_id', user.id)
      .single();

    if (receiptError || !receipt) {
      return jsonResponse({ error: 'Receipt not found' }, 404);
    }

    await admin
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receiptId);

    let ocr: OcrPayload;

    if (receipt.mime_type === 'application/pdf') {
      ocr = {
        ...mockOcrResult(),
        confidence: 0,
        rawText: 'PDF: OCR cloud pendente — preencher manualmente.',
        source: 'mock',
      };
    } else {
      const { data: fileData, error: downloadError } = await admin.storage
        .from('receipts')
        .download(receipt.storage_path);

      if (downloadError || !fileData) {
        await admin.from('receipts').update({ status: 'failed' }).eq('id', receiptId);
        return jsonResponse({ error: 'Failed to download receipt image' }, 500);
      }

      const buffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const imageBase64 = btoa(binary);

      if (googleVisionKey) {
        const visionResult = await runGoogleVision(imageBase64, googleVisionKey);
        ocr = visionResult ?? parseReceiptText('');
        if (!visionResult) {
          ocr = mockOcrResult();
        }
      } else {
        ocr = mockOcrResult();
      }
    }

    const { data: ocrRow, error: ocrError } = await admin
      .from('ocr_results')
      .upsert(
        {
          receipt_id: receiptId,
          user_id: user.id,
          merchant_name: ocr.merchantName,
          total_amount: ocr.totalAmount,
          receipt_date: ocr.date ?? null,
          suggested_category: ocr.suggestedCategory,
          confidence: ocr.confidence,
          raw_text: ocr.rawText,
          items: ocr.items ?? [],
          source: ocr.source,
        },
        { onConflict: 'receipt_id' },
      )
      .select()
      .single();

    if (ocrError) {
      await admin.from('receipts').update({ status: 'failed' }).eq('id', receiptId);
      return jsonResponse({ error: ocrError.message }, 500);
    }

    await admin.from('receipts').update({ status: 'ready' }).eq('id', receiptId);

    return jsonResponse({ ocrResult: ocrRow });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

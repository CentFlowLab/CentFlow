import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  inferCategoryFromMerchant,
  parseReceiptFromRawText,
  type ParsedReceipt,
} from '../_shared/parse-receipt-pt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OcrResponse = {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  suggestedCategory?: string;
  confidence: number;
  rawText: string;
  items: ParsedReceipt['items'];
  nif?: string;
  atcud?: string;
  vatAmount?: number;
  source: 'google_vision' | 'mock';
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toOcrResponse(parsed: ParsedReceipt, source: OcrResponse['source']): OcrResponse {
  return {
    merchantName: parsed.merchantName,
    totalAmount: parsed.totalAmount,
    date: parsed.date,
    suggestedCategory: inferCategoryFromMerchant(parsed.merchantName),
    confidence: Math.min(parsed.confidence + (source === 'google_vision' ? 0.15 : 0), 1),
    rawText: parsed.rawText,
    items: parsed.items ?? [],
    nif: parsed.nif,
    atcud: parsed.atcud,
    vatAmount: parsed.vatAmount,
    source,
  };
}

async function runGoogleVision(
  imageBase64: string,
  apiKey: string,
): Promise<OcrResponse | null> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
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

  if (!rawText || rawText.length < 8) return null;

  const parsed = parseReceiptFromRawText(rawText);
  return toOcrResponse(parsed, 'google_vision');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

    const body = await req.json();
    const receiptId = body?.receiptId as string | undefined;

    if (!receiptId || typeof receiptId !== 'string') {
      return jsonResponse({ error: 'receiptId is required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleVisionKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    if (!googleVisionKey) {
      return jsonResponse(
        {
          error: 'GOOGLE_VISION_API_KEY not configured',
          hint: 'Run: supabase secrets set GOOGLE_VISION_API_KEY=<key>',
        },
        503,
      );
    }

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

    if (receipt.mime_type === 'application/pdf') {
      return jsonResponse(
        {
          error: 'PDF OCR not supported yet',
          hint: 'Use photo of receipt or fill manually',
        },
        422,
      );
    }

    await admin
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receiptId);

    const { data: fileData, error: downloadError } = await admin.storage
      .from('receipts')
      .download(receipt.storage_path);

    if (downloadError || !fileData) {
      await admin.from('receipts').update({ status: 'failed' }).eq('id', receiptId);
      return jsonResponse({ error: 'Failed to download receipt image' }, 500);
    }

    const buffer = await fileData.arrayBuffer();
    const imageBase64 = bytesToBase64(new Uint8Array(buffer));

    const ocr = await runGoogleVision(imageBase64, googleVisionKey);

    if (!ocr) {
      await admin.from('receipts').update({ status: 'failed' }).eq('id', receiptId);
      return jsonResponse({ error: 'Google Vision returned no text' }, 422);
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

    return jsonResponse({
      ocrResult: ocrRow,
      parsed: {
        nif: ocr.nif,
        atcud: ocr.atcud,
        vatAmount: ocr.vatAmount,
      },
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

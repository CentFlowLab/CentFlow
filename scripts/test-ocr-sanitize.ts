/**
 * Testes das heurísticas OCR PT (NIF, ATCUD, IVA, totais).
 * Executar: npx tsx scripts/test-ocr-sanitize.ts
 */
import { parseReceiptFromRawText, isValidPtNif } from '../lib/receipt/parse-receipt-pt';
import { sanitizeOcrResult } from '../lib/receipt/ocr-sanitize';

const SAMPLES = [
  {
    name: 'Continente',
    text: `CONTINENTE HIPERMERCADOS
Rua Exemplo 123
NIF 502011475
12/06/2026 14:32
Leite UHT 1L          1,19
Pão de forma          1,49
IVA (23%)             7,95
TOTAL EUR            42,50
ATCUD: JF8T-1234`,
    expect: { merchant: 'CONTINENTE', total: 42.5, atcud: 'JF8T-1234' },
  },
  {
    name: 'Galp',
    text: `GALP ENERGIA
Data: 05-03-2026
NIF: 504718292
Gasóleo               65,00
TOTAL: 65,00 EUR`,
    expect: { merchant: 'GALP', total: 65 },
  },
  {
    name: 'Worten',
    text: `WORTEN ELECTRÓNICA
NIF 502030712
15/03/2026
Cabo HDMI 2m           12,99
TOTAL                  12,99`,
    expect: { merchant: 'WORTEN', total: 12.99 },
  },
  {
    name: 'Minipreço',
    text: `MINIPREÇO
Talão: 004521
02-06-26
Água 1.5L               0,39
Iogurte natural         1,89
TOTAL A PAGAR          15,40`,
    expect: { merchant: 'MINIPREÇO', total: 15.4 },
  },
  {
    name: 'Lidl (total em linha separada)',
    text: `LIDL & Cia - Porto de Mós
FATURA SIMPLIFICADA
NIF 503340855
2026-03-08
SERUM FACIAL            4,49
Aparelho Limp           99,99
TOTAL
100,75 EUR
ATCUD AB12CD34-5678`,
    expect: { merchant: 'LIDL', total: 100.75, atcud: 'AB12CD34-5678' },
  },
];

let passed = 0;
let failed = 0;

console.log('=== parseReceiptFromRawText (PT rules) ===\n');

for (const sample of SAMPLES) {
  const parsed = parseReceiptFromRawText(sample.text);
  const okMerchant =
    !sample.expect.merchant ||
    (parsed.merchantName?.toUpperCase().includes(sample.expect.merchant) ?? false);
  const okTotal =
    sample.expect.total === undefined || parsed.totalAmount === sample.expect.total;
  const okAtcud =
    !sample.expect.atcud || parsed.atcud === sample.expect.atcud;

  const ok = okMerchant && okTotal && okAtcud;
  if (ok) passed++;
  else failed++;

  console.log(`${ok ? '✓' : '✗'} ${sample.name}`);
  console.log('  merchant:', parsed.merchantName, okMerchant ? '' : `≠ ${sample.expect.merchant}`);
  console.log('  total:', parsed.totalAmount, okTotal ? '' : `≠ ${sample.expect.total}`);
  console.log('  date:', parsed.date);
  console.log('  nif:', parsed.nif, parsed.nif ? (isValidPtNif(parsed.nif) ? '(valid)' : '(invalid)') : '');
  console.log('  atcud:', parsed.atcud);
  console.log('  iva:', parsed.vatAmount, parsed.vatRate != null ? `@${parsed.vatRate}%` : '');
  console.log('  items:', parsed.items?.length ?? 0);
  console.log('  confidence:', parsed.confidence.toFixed(2));
  console.log('');
}

console.log('=== sanitizeOcrResult (noisy API + Vision rawText) ===\n');
const noisyApi = sanitizeOcrResult({
  merchantName: 'XXX',
  totalAmount: 999.99,
  confidence: 0.4,
  source: 'api',
  rawText: SAMPLES[0].text,
  items: [
    { name: 'x', total: 0.01 },
    { name: 'Leite UHT 1L', total: 1.19 },
    { name: 'fantasma', total: 500 },
  ],
});
console.log('Continente noisy merge:', {
  merchant: noisyApi?.merchantName,
  total: noisyApi?.totalAmount,
  items: noisyApi?.items?.length,
  confidence: noisyApi?.confidence,
});

console.log(`\n=== Resultado: ${passed}/${SAMPLES.length} passed, ${failed} failed ===`);

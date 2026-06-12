/**
 * Testes manuais das heurísticas OCR PT.
 * Executar: npx tsx scripts/test-ocr-sanitize.ts
 */
import { parseReceiptFromRawText, sanitizeOcrResult } from '../lib/receipt/ocr-sanitize';

const SAMPLES = [
  `CONTINENTE HIPERMERCADOS
Rua Exemplo 123
12/06/2026 14:32
Leite UHT 1L          1,19
Pão de forma          1,49
TOTAL EUR            42,50`,

  `GALP ENERGIA
Data: 05-03-2026
Gasóleo               65,00
TOTAL: 65,00 EUR`,

  `TOTAL ERRADO OCR
item fantasma 999,99
lixo 0,00
TOTAL 18,75`,
];

console.log('=== parseReceiptFromRawText ===\n');
for (const sample of SAMPLES) {
  console.log('---');
  console.log(parseReceiptFromRawText(sample));
}

console.log('\n=== sanitizeOcrResult (merge API + raw) ===\n');
const noisyApi = sanitizeOcrResult({
  merchantName: 'XXX',
  totalAmount: 999.99,
  confidence: 0.4,
  rawText: SAMPLES[0],
  items: [
    { name: 'x', total: 0.01 },
    { name: 'Leite UHT 1L', total: 1.19 },
    { name: 'fantasma', total: 500 },
  ],
});
console.log(noisyApi);

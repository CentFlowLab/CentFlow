# Pipeline OCR — CentFlow

## Fluxo actual (mobile v3 → API)

1. **Picker** (`expo-image-picker`) — foto ou galeria, sem crop manual
2. **Pré-processamento** (`receipt-image-preprocess.ts` v3)
   - Rotação EXIF (`receipt-exif.ts`)
   - Resize largura máx. **1200px**
   - Contraste + binarização suave (`receipt-image-enhance.ts` + `jpeg-js`)
   - Compressão JPEG inteligente (0.90 → 0.78 se > 1.8MB)
3. **Upload** `POST /receipts` (multipart + hints `preprocess_version=3`, `deskew=true`)
4. **OCR** `POST /receipts/:id/ocr` — fallback multi-motor:
   - `google_vision` → `vision` → `auto` → `tesseract` (psm 4)
5. **Polling** `GET /ocr-result` (até 8×, 1.2s)
6. **Sanitização client** (`ocr-sanitize.ts`)

## Estado do backend neste repositório

**Não há código de servidor aqui.** O motor OCR corre em `https://api.centflow.app`.

Implementação de referência para a equipa backend:
- `docs/backend/ocr_preprocess.py` — deskew, CLAHE, binarização, Tesseract `por+eng --psm 6 --oem 3`

## Melhorias obrigatórias no BACKEND (maior impacto)

O mobile v3 já envia imagem optimizada. O ganho restante está no servidor:

| Passo | Ferramenta | Notas |
|-------|------------|-------|
| Deskew | OpenCV `minAreaRect` | Crítico para fotos inclinadas |
| Binarização | `adaptiveThreshold` | Talões térmicos |
| Motor primário | Google Vision `DOCUMENT_TEXT_DETECTION` | Melhor para PT |
| Fallback | Tesseract 5 `por+eng --psm 6 --oem 3` | Só após pré-processamento |
| Parser PT | Regex TOTAL, datas DD/MM/YYYY | Validar soma(itens) ≈ total |

### Respeitar hints do mobile

- `preprocess_version=3` → **não** repetir contraste agressivo; aplicar deskew + OCR
- `deskew=true` → corrigir inclinação antes do motor
- `enhance_contrast=client_done` → servidor salta CLAHE

### Tesseract recomendado

```bash
tesseract image.png stdout -l por+eng --psm 6 --oem 3
```

Alternativa talões estreitos: `--psm 4`

## Teste controlado (utilizador)

1. `.env`: `EXPO_PUBLIC_MOCK_AUTH=false` (mock devolve dados fictícios perfeitos)
2. Foto com boa luz, talão plano, sem reflexos
3. Comparar `rawText` no ecrã de confirmação antes/depois de v3
4. Backend: `python docs/backend/ocr_preprocess.py foto.jpg`

## Script de teste local (heurísticas PT)

```bash
npx tsx scripts/test-ocr-sanitize.ts
```

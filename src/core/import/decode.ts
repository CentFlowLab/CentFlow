/** Caracteres de 0x80 a 0x9F no Windows-1252 (o resto coincide com Latin-1). */
const CP1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152,
  0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122,
  0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];

/** Descodifica UTF-8 válido; devolve `null` ao primeiro byte inválido (não substitui por "�"). */
function decodeUtf8Strict(bytes: Uint8Array): string | null {
  const codePoints: number[] = [];
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index]!;
    let length: number;
    let point: number;
    if (first < 0x80) {
      length = 1;
      point = first;
    } else if (first >= 0xc2 && first <= 0xdf) {
      length = 2;
      point = first & 0x1f;
    } else if (first >= 0xe0 && first <= 0xef) {
      length = 3;
      point = first & 0x0f;
    } else if (first >= 0xf0 && first <= 0xf4) {
      length = 4;
      point = first & 0x07;
    } else {
      return null;
    }
    if (index + length > bytes.length) return null;
    for (let offset = 1; offset < length; offset += 1) {
      const next = bytes[index + offset]!;
      if ((next & 0xc0) !== 0x80) return null;
      point = (point << 6) | (next & 0x3f);
    }
    const tooSmall =
      (length === 3 && point < 0x800) || (length === 4 && (point < 0x10000 || point > 0x10ffff));
    if (tooSmall || (point >= 0xd800 && point <= 0xdfff)) return null;
    codePoints.push(point);
    index += length;
  }
  let text = '';
  for (let start = 0; start < codePoints.length; start += 4096) {
    text += String.fromCodePoint(...codePoints.slice(start, start + 4096));
  }
  return text;
}

function decodeWindows1252(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 0x80 && byte <= 0x9f ? CP1252_HIGH[byte - 0x80]! : byte);
  }
  return text;
}

/**
 * Texto de um extrato. Muitos bancos exportam em Windows-1252: se os bytes não forem UTF-8
 * válido, lê-se como Windows-1252 em vez de mostrar caracteres trocados.
 */
export function decodeStatementBytes(bytes: Uint8Array): string {
  return decodeUtf8Strict(bytes) ?? decodeWindows1252(bytes);
}

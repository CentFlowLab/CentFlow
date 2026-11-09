import { decodeStatementBytes } from '../decode';

describe('decodeStatementBytes', () => {
  it('reads UTF-8, including accents and the euro sign', () => {
    const bytes = new Uint8Array([
      0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xc3, 0xa7, 0xc3, 0xa3, 0x6f, 0x20, 0xe2, 0x82, 0xac,
    ]);
    expect(decodeStatementBytes(bytes)).toBe('Descrição €');
  });

  it('falls back to Windows-1252 when the bytes are not valid UTF-8', () => {
    const bytes = new Uint8Array([
      0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7, 0xe3, 0x6f, 0x20, 0x80,
    ]);
    expect(decodeStatementBytes(bytes)).toBe('Descrição €');
  });

  it('keeps plain ASCII as is', () => {
    expect(decodeStatementBytes(new Uint8Array([0x61, 0x3b, 0x62]))).toBe('a;b');
  });
});

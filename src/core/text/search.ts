/**
 * Normaliza texto para pesquisa: minúsculas, sem acentos e espaços colapsados
 * ("Café  da Manhã" → "cafe da manha").
 */
export function normalizeSearchText(value: string): string {
  let text = value;
  try {
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // Motores sem `normalize`: mantém o texto original.
  }
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

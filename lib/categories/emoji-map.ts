export const CATEGORY_EMOJI_MAP: Record<string, string> = {
  cafe: '☕',
  café: '☕',
  coffee: '☕',
  restaurante: '🍽️',
  restaurant: '🍽️',
  supermercado: '🛒',
  mercado: '🛒',
  padaria: '🥐',
  pastelaria: '🥐',
  takeaway: '🥡',
  delivery: '🥡',
  pizza: '🍕',
  hamburguer: '🍔',
  sushi: '🍣',
  bebidas: '🥤',
  bar: '🍺',
  tabaco: '🚬',
  cigarro: '🚬',
  cigarros: '🚬',
  iqos: '🚬',
  marlboro: '🚬',
  vaping: '💨',
  combustivel: '⛽',
  combustível: '⛽',
  gasolina: '⛽',
  'gasóleo': '⛽',
  gasoleo: '⛽',
  uber: '🚗',
  taxi: '🚕',
  táxi: '🚕',
  autobus: '🚌',
  autocarro: '🚌',
  metro: '🚇',
  estacionamento: '🅿️',
  portagem: '🛣️',
  aviao: '✈️',
  avião: '✈️',
  voo: '✈️',
  roupa: '👕',
  vestuario: '👕',
  vestuário: '👕',
  calcado: '👟',
  calçado: '👟',
  sapatos: '👟',
  'eletrónica': '📱',
  eletronica: '📱',
  tecnologia: '💻',
  amazon: '📦',
  online: '🛍️',
  farmacia: '💊',
  farmácia: '💊',
  medicamentos: '💊',
  medico: '🏥',
  médico: '🏥',
  hospital: '🏥',
  ginasio: '🏋️',
  ginásio: '🏋️',
  gym: '🏋️',
  dentista: '🦷',
  renda: '🏠',
  casa: '🏠',
  habitacao: '🏠',
  habitação: '🏠',
  agua: '💧',
  água: '💧',
  eletricidade: '⚡',
  luz: '⚡',
  gas: '🔥',
  gás: '🔥',
  internet: '📶',
  condominio: '🏢',
  condomínio: '🏢',
  netflix: '🎬',
  spotify: '🎵',
  streaming: '📺',
  cinema: '🎬',
  concerto: '🎤',
  teatro: '🎭',
  livros: '📚',
  jogos: '🎮',
  seguro: '🛡️',
  imposto: '🏛️',
  irs: '🏛️',
  credito: '💳',
  crédito: '💳',
  emprestimo: '🏦',
  empréstimo: '🏦',
  poupanca: '🐷',
  poupança: '🐷',
  escola: '🏫',
  universidade: '🎓',
  curso: '📖',
  propinas: '🎓',
  veterinario: '🐾',
  veterinário: '🐾',
  animal: '🐾',
  hotel: '🏨',
  airbnb: '🏠',
  ferias: '🏖️',
  férias: '🏖️',
  salario: '💰',
  salário: '💰',
  ordenado: '💰',
  presente: '🎁',
  prenda: '🎁',
  donativo: '❤️',
  caridade: '❤️',
};

export const DEFAULT_CATEGORY_EMOJI = '🏷️';

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Sugere emoji com base em palavras-chave no nome da categoria. */
export function getAutoEmoji(categoryName: string): string | null {
  const normalized = normalizeForMatch(categoryName);
  if (!normalized) return null;

  for (const [keyword, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    const normalizedKey = normalizeForMatch(keyword);
    if (normalized.includes(normalizedKey)) {
      return emoji;
    }
  }
  return null;
}

/** Emoji efectivo: guardado, sugerido por keyword, ou default. */
export function resolveCategoryEmoji(
  categoryName: string,
  storedEmoji?: string | null,
): string {
  if (storedEmoji?.trim()) return storedEmoji.trim();
  return getAutoEmoji(categoryName) ?? DEFAULT_CATEGORY_EMOJI;
}

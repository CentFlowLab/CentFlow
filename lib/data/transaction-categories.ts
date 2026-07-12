import type { SymbolViewProps } from 'expo-symbols';

import type { TransactionType } from '@/lib/domain/transaction.types';

export type TransactionCategory = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
  /** Cor de destaque para ícones (dark mode). */
  accentColor: string;
  /** Secção a que pertence (para o seletor agrupado). */
  group?: string;
};

type CategoryItemSeed = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
};

export type CategoryGroup = {
  title: string;
  items: CategoryItemSeed[];
};

const ICONS = {
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  cart: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
  cup: { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' },
  bag: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  car: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
  bus: { ios: 'bus.fill', android: 'directions_bus', web: 'directions_bus' },
  fuel: { ios: 'fuelpump.fill', android: 'local_gas_station', web: 'local_gas_station' },
  wrench: { ios: 'wrench.and.screwdriver.fill', android: 'build', web: 'build' },
  parking: { ios: 'parkingsign', android: 'local_parking', web: 'local_parking' },
  plane: { ios: 'airplane', android: 'flight', web: 'flight' },
  house: { ios: 'house.fill', android: 'home', web: 'home' },
  drop: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  wifi: { ios: 'wifi', android: 'wifi', web: 'wifi' },
  building: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  pills: { ios: 'pills.fill', android: 'medication', web: 'medication' },
  stethoscope: { ios: 'stethoscope', android: 'medical_services', web: 'medical_services' },
  dumbbell: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  eye: { ios: 'eyeglasses', android: 'visibility', web: 'visibility' },
  film: { ios: 'film.fill', android: 'movie', web: 'movie' },
  music: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  game: { ios: 'gamecontroller.fill', android: 'sports_esports', web: 'sports_esports' },
  book: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  sport: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  tshirt: { ios: 'tshirt.fill', android: 'checkroom', web: 'checkroom' },
  laptop: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' },
  sofa: { ios: 'sofa.fill', android: 'chair', web: 'chair' },
  globe: { ios: 'globe', android: 'public', web: 'public' },
  repeat: { ios: 'repeat', android: 'autorenew', web: 'autorenew' },
  tv: { ios: 'play.tv.fill', android: 'live_tv', web: 'live_tv' },
  app: { ios: 'app.badge.fill', android: 'apps', web: 'apps' },
  shield: { ios: 'shield.fill', android: 'shield', web: 'shield' },
  doc: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  bank: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  card: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  refund: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  gift: { ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' },
  hands: { ios: 'hands.sparkles.fill', android: 'volunteer_activism', web: 'volunteer_activism' },
  briefcase: { ios: 'briefcase.fill', android: 'work', web: 'work' },
  banknote: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  dots: { ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' },
  tag: { ios: 'tag.fill', android: 'label', web: 'label' },
} satisfies Record<string, SymbolViewProps['name']>;

/** Paleta de acento por grupo — legível sobre fundos muted em todos os temas. */
const GROUP_ACCENT_COLORS: Record<string, string> = {
  'Alimentação & Restauração': '#F97316',
  Transportes: '#38BDF8',
  Habitação: '#A78BFA',
  Saúde: '#F472B6',
  'Lazer & Entretenimento': '#E879F9',
  Compras: '#FB7185',
  'Despesas recorrentes': '#6366F1',
  Finanças: '#94A3B8',
  Outros: '#CBD5E1',
  'Rendimentos principais': '#22C55E',
  'Outras entradas': '#14B8A6',
};

const FALLBACK_ACCENT_COLORS = [
  '#6366F1',
  '#22C55E',
  '#F97316',
  '#38BDF8',
  '#E879F9',
  '#14B8A6',
  '#F472B6',
  '#A855F7',
] as const;

function accentForGroup(groupTitle: string): string {
  return GROUP_ACCENT_COLORS[groupTitle] ?? FALLBACK_ACCENT_COLORS[0];
}

function withAccent(groups: CategoryGroup[]): TransactionCategory[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      accentColor: accentForGroup(group.title),
      group: group.title,
    })),
  );
}

/** Ícone por omissão para categorias personalizadas. */
export const CUSTOM_CATEGORY_ICON: SymbolViewProps['name'] = ICONS.tag;

export const EXPENSE_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: 'Alimentação & Restauração',
    items: [
      { id: 'supermarket', label: 'Supermercado', icon: ICONS.cart },
      { id: 'restaurant', label: 'Restaurante', icon: ICONS.food },
      { id: 'cafe', label: 'Café', icon: ICONS.cup },
      { id: 'takeaway', label: 'Takeaway', icon: ICONS.bag },
      { id: 'bakery', label: 'Padaria', icon: ICONS.cup },
      { id: 'drinks', label: 'Bebidas', icon: ICONS.cup },
    ],
  },
  {
    title: 'Transportes',
    items: [
      { id: 'fuel', label: 'Combustível', icon: ICONS.fuel },
      { id: 'public_transport', label: 'Transporte público', icon: ICONS.bus },
      { id: 'taxi', label: 'Táxi / Uber', icon: ICONS.car },
      { id: 'car_maintenance', label: 'Manutenção auto', icon: ICONS.wrench },
      { id: 'parking', label: 'Estacionamento', icon: ICONS.parking },
      { id: 'travel', label: 'Viagens', icon: ICONS.plane },
    ],
  },
  {
    title: 'Habitação',
    items: [
      { id: 'rent', label: 'Renda', icon: ICONS.house },
      { id: 'water', label: 'Água', icon: ICONS.drop },
      { id: 'electricity', label: 'Eletricidade', icon: ICONS.bolt },
      { id: 'gas', label: 'Gás', icon: ICONS.flame },
      { id: 'internet', label: 'Internet', icon: ICONS.wifi },
      { id: 'condo', label: 'Condomínio', icon: ICONS.building },
      { id: 'home_maintenance', label: 'Manutenção', icon: ICONS.wrench },
    ],
  },
  {
    title: 'Saúde',
    items: [
      { id: 'pharmacy', label: 'Farmácia', icon: ICONS.pills },
      { id: 'doctor', label: 'Médico', icon: ICONS.stethoscope },
      { id: 'dentist', label: 'Dentista', icon: ICONS.heart },
      { id: 'gym', label: 'Ginásio', icon: ICONS.dumbbell },
      { id: 'optics', label: 'Óptica', icon: ICONS.eye },
    ],
  },
  {
    title: 'Lazer & Entretenimento',
    items: [
      { id: 'cinema', label: 'Cinema', icon: ICONS.film },
      { id: 'music', label: 'Música', icon: ICONS.music },
      { id: 'games', label: 'Jogos', icon: ICONS.game },
      { id: 'books', label: 'Livros', icon: ICONS.book },
      { id: 'sports', label: 'Desporto', icon: ICONS.sport },
      { id: 'leisure_travel', label: 'Viagens lazer', icon: ICONS.plane },
    ],
  },
  {
    title: 'Compras',
    items: [
      { id: 'clothing', label: 'Roupa', icon: ICONS.tshirt },
      { id: 'electronics', label: 'Eletrónica', icon: ICONS.laptop },
      { id: 'home_goods', label: 'Casa', icon: ICONS.sofa },
      { id: 'online', label: 'Online', icon: ICONS.globe },
      { id: 'other_products', label: 'Outros produtos', icon: ICONS.bag },
    ],
  },
  {
    title: 'Despesas recorrentes',
    items: [
      { id: 'streaming', label: 'Streaming', icon: ICONS.tv },
      { id: 'software', label: 'Software', icon: ICONS.laptop },
      { id: 'magazines', label: 'Revistas', icon: ICONS.book },
      { id: 'apps', label: 'Apps', icon: ICONS.app },
    ],
  },
  {
    title: 'Finanças',
    items: [
      { id: 'insurance', label: 'Seguro', icon: ICONS.shield },
      { id: 'tax', label: 'Imposto', icon: ICONS.doc },
      { id: 'bank', label: 'Banco', icon: ICONS.bank },
      { id: 'investment_exp', label: 'Investimento', icon: ICONS.chart },
      { id: 'credit', label: 'Crédito', icon: ICONS.card },
    ],
  },
  {
    title: 'Outros',
    items: [
      { id: 'education', label: 'Educação', icon: ICONS.school },
      { id: 'gifts', label: 'Prendas', icon: ICONS.gift },
      { id: 'charity', label: 'Caridade', icon: ICONS.hands },
      { id: 'work', label: 'Trabalho', icon: ICONS.briefcase },
      { id: 'other', label: 'Outros', icon: ICONS.dots },
    ],
  },
];

export const INCOME_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: 'Rendimentos principais',
    items: [
      { id: 'salary', label: 'Salário', icon: ICONS.banknote },
      { id: 'freelance', label: 'Freelance', icon: ICONS.laptop },
      { id: 'bonus', label: 'Subsídio / bónus', icon: ICONS.gift },
    ],
  },
  {
    title: 'Outras entradas',
    items: [
      { id: 'refund', label: 'Reembolso', icon: ICONS.refund },
      { id: 'sale', label: 'Venda', icon: ICONS.bag },
      { id: 'investment', label: 'Investimentos', icon: ICONS.chart },
      { id: 'gift_income', label: 'Oferta recebida', icon: ICONS.gift },
      { id: 'other', label: 'Outra fonte', icon: ICONS.dots },
    ],
  },
];

function withGroups(groups: CategoryGroup[]): TransactionCategory[] {
  return withAccent(groups);
}

export const EXPENSE_CATEGORIES: TransactionCategory[] = withGroups(EXPENSE_CATEGORY_GROUPS);
export const INCOME_CATEGORIES: TransactionCategory[] = withGroups(INCOME_CATEGORY_GROUPS);

/**
 * Labels de ids antigos (modelo anterior) para que movimentos já guardados
 * continuem a mostrar o nome correcto após a expansão das categorias.
 */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  food: 'Alimentação',
  transport: 'Transportes',
  housing: 'Habitação',
  shopping: 'Compras',
  health: 'Saúde',
  leisure: 'Lazer',
  subscriptions: 'Despesas recorrentes',
  bonus: 'Subsídio / bónus',
  sale: 'Venda',
  gift_income: 'Oferta recebida',
};

export function getCategoryGroups(type: TransactionType): CategoryGroup[] {
  return type === 'income' ? INCOME_CATEGORY_GROUPS : EXPENSE_CATEGORY_GROUPS;
}

export function getCategoriesForType(type: TransactionType): TransactionCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryLabel(categoryId: string, type: TransactionType): string {
  if (type === 'transfer') return 'Transferência';
  if (type === 'credit_payment' || type === 'credit_card_payment') return 'Pagamento de cartão';
  if (type === 'credit_card_refund') return 'Reembolso no cartão';
  if (type === 'balance_adjustment') return 'Ajuste de saldo';
  const catalogType = type === 'income' ? 'income' : 'expense';
  const fromCatalog = getCategoriesForType(catalogType).find((c) => c.id === categoryId);
  if (fromCatalog) return fromCatalog.label;
  if (LEGACY_CATEGORY_LABELS[categoryId]) return LEGACY_CATEGORY_LABELS[categoryId];
  return categoryId;
}

export function getCategoryById(
  categoryId: string,
  type: TransactionType,
): TransactionCategory | undefined {
  return getCategoriesForType(type).find((c) => c.id === categoryId);
}

/** Cor de acento do ícone da categoria (fallback determinístico para ids desconhecidos). */
export function getCategoryAccentColor(categoryId: string, type: TransactionType): string {
  const catalogType = type === 'income' ? 'income' : 'expense';
  const found = getCategoryById(categoryId, catalogType);
  if (found?.accentColor) return found.accentColor;

  let hash = 0;
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash + categoryId.charCodeAt(i) * (i + 1)) % FALLBACK_ACCENT_COLORS.length;
  }
  return FALLBACK_ACCENT_COLORS[hash] ?? FALLBACK_ACCENT_COLORS[0];
}

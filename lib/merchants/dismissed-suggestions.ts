import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'dismissed_merchant_suggestions';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DismissedEntry = {
  hash: string;
  dismissedAt: string;
};

type DismissedStore = {
  entries: DismissedEntry[];
};

function hashDescriptions(descriptions: string[]): string {
  return descriptions
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

async function loadStore(userId: string): Promise<DismissedStore> {
  return (await readUserJson<DismissedStore>(SCOPE, userId)) ?? { entries: [] };
}

export async function isMerchantSuggestionDismissed(
  userId: string,
  descriptions: string[],
): Promise<boolean> {
  const hash = hashDescriptions(descriptions);
  const store = await loadStore(userId);
  const entry = store.entries.find((e) => e.hash === hash);
  if (!entry) return false;

  const age = Date.now() - new Date(entry.dismissedAt).getTime();
  return age < TTL_MS;
}

export async function dismissMerchantSuggestion(
  userId: string,
  descriptions: string[],
): Promise<void> {
  const hash = hashDescriptions(descriptions);
  const store = await loadStore(userId);
  const now = new Date().toISOString();
  const filtered = store.entries.filter((e) => e.hash !== hash);
  await writeUserJson(SCOPE, userId, {
    entries: [...filtered, { hash, dismissedAt: now }],
  });
}

export { hashDescriptions };

import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const SCOPE = 'ui_flags';

type UiFlags = {
  backTapGuideShown?: boolean;
};

/** Verdadeiro se o guia de Back Tap já foi mostrado a este utilizador. */
export async function hasSeenBackTapGuide(userId: string): Promise<boolean> {
  const flags = await readUserJson<UiFlags>(SCOPE, userId);
  return Boolean(flags?.backTapGuideShown);
}

/** Marca o guia de Back Tap como mostrado (nunca volta a aparecer). */
export async function markBackTapGuideShown(userId: string): Promise<void> {
  const flags = (await readUserJson<UiFlags>(SCOPE, userId)) ?? {};
  await writeUserJson<UiFlags>(SCOPE, userId, { ...flags, backTapGuideShown: true });
}

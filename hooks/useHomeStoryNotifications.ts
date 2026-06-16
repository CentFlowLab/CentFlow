import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildAttentionSignature,
  buildChangesSignature,
  buildProfileSignature,
  loadStorySeenState,
  saveStorySeenState,
  type HomeStoryId,
} from '@/lib/home/story-seen.storage';
import { useAuth } from '@/lib/auth';

type UseHomeStoryNotificationsInput = {
  profileScore: number;
  profilePendingCount: number;
  weeklySpending: number;
  netWorthChangeThisMonth: number;
  personalInflation: number | null;
  attentionIds: string[];
};

function hasActivity(input: UseHomeStoryNotificationsInput): boolean {
  return (
    input.weeklySpending > 0 ||
    Math.abs(input.netWorthChangeThisMonth) > 0 ||
    input.personalInflation !== null
  );
}

export function useHomeStoryNotifications(input: UseHomeStoryNotificationsInput) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [seen, setSeen] = useState<Awaited<ReturnType<typeof loadStorySeenState>>>({});

  const signatures = useMemo(
    () => ({
      profile: buildProfileSignature(input.profileScore, input.profilePendingCount),
      changes: buildChangesSignature(
        input.weeklySpending,
        input.netWorthChangeThisMonth,
        input.personalInflation,
      ),
      attention: buildAttentionSignature(input.attentionIds),
    }),
    [
      input.profileScore,
      input.profilePendingCount,
      input.weeklySpending,
      input.netWorthChangeThisMonth,
      input.personalInflation,
      input.attentionIds,
    ],
  );

  useEffect(() => {
    if (!userId) return;
    void loadStorySeenState(userId).then(setSeen);
  }, [userId]);

  const hasUnread = useMemo(
    () => ({
      profile:
        (seen.profileSignature === undefined && input.profilePendingCount > 0) ||
        (seen.profileSignature !== undefined &&
          signatures.profile !== seen.profileSignature),
      changes:
        (seen.changesSignature === undefined && hasActivity(input)) ||
        (seen.changesSignature !== undefined &&
          signatures.changes !== seen.changesSignature),
      attention:
        (seen.attentionSignature === undefined && input.attentionIds.length > 0) ||
        (seen.attentionSignature !== undefined &&
          signatures.attention !== seen.attentionSignature),
    }),
    [signatures, seen, input],
  );

  const markStorySeen = useCallback(
    async (storyId: HomeStoryId) => {
      if (!userId) return;

      const patch =
        storyId === 'profile'
          ? { profileSignature: signatures.profile }
          : storyId === 'changes'
            ? { changesSignature: signatures.changes }
            : { attentionSignature: signatures.attention };

      const next = await saveStorySeenState(userId, patch);
      setSeen(next);
    },
    [userId, signatures],
  );

  return { hasUnread, markStorySeen };
}

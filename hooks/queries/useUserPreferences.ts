import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { applyTheme, syncLegacyColorsObject } from '@/lib/theme/theme-store';
import { colors as legacyColors } from '@/lib/theme/colors';
import { fetchUserPreferences, updateUserPreferences } from '@/lib/preferences';
import type { UserPreferences } from '@/lib/preferences/types';
import { useAuth } from '@/lib/auth';

export function useUserPreferences() {
  const { user, isAuthenticated } = useAuth();

  return useQuery<UserPreferences>({
    queryKey: queryKeys.preferences,
    queryFn: () => fetchUserPreferences(user!.id),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => {
      if (!user?.id) throw new Error('Sessão inválida. Inicia sessão novamente.');
      return updateUserPreferences(user.id, patch);
    },
    onMutate: (patch) => {
      if (patch.themeId) {
        applyTheme(patch.themeId);
        syncLegacyColorsObject(legacyColors);
      }
      const previous = queryClient.getQueryData<UserPreferences>(queryKeys.preferences);
      if (previous) {
        queryClient.setQueryData(queryKeys.preferences, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.preferences, context.previous);
        applyTheme(context.previous.themeId);
        syncLegacyColorsObject(legacyColors);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.preferences, data);
      applyTheme(data.themeId);
      syncLegacyColorsObject(legacyColors);
    },
  });
}

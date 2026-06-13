import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import {
  changePassword,
  updateProfile,
  updateProfileCurrency,
} from '@/lib/api/services/profile.service';
import { useAuth } from '@/lib/auth';
import type { ChangePasswordInput, SupportedCurrency, UpdateProfileInput } from '@/lib/preferences/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(user!.id, input, user!),
    onSuccess: async (result) => {
      await refreshUser({
        name: result.name,
        email: result.email,
        avatarInitials: result.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: (currency: SupportedCurrency) =>
      updateProfileCurrency(user!.id, currency, user!),
    onSuccess: async (updatedUser) => {
      await refreshUser({ currency: updatedUser.currency });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}

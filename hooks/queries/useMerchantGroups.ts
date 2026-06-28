import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
import type {
  CreateMerchantGroupInput,
  MerchantGroup,
  UpdateMerchantGroupInput,
} from '@/lib/domain/merchant-group.types';
import {
  addAliasToGroup,
  createMerchantGroup,
  deleteMerchantGroup,
  fetchMerchantGroups,
  removeAliasFromGroup,
  updateMerchantGroup,
} from '@/lib/merchants/merchant-groups.service';
import { useAuth } from '@/lib/auth';

export function useMerchantGroups() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';

  return useQuery<MerchantGroup[]>({
    queryKey: queryKeys.merchantGroups(userId),
    queryFn: () => fetchMerchantGroups(userId),
    enabled: isAuthenticated && Boolean(userId),
    staleTime: 1000 * 60 * 2,
  });
}

function useInvalidateMerchantData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.merchantGroups(userId) });
    invalidateTransactionQueries(queryClient);
  };
}

export function useCreateMerchantGroup() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const invalidate = useInvalidateMerchantData();

  return useMutation({
    mutationFn: (input: CreateMerchantGroupInput) => createMerchantGroup(userId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateMerchantGroup() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const invalidate = useInvalidateMerchantData();

  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: UpdateMerchantGroupInput }) =>
      updateMerchantGroup(userId, groupId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteMerchantGroup() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const invalidate = useInvalidateMerchantData();

  return useMutation({
    mutationFn: (groupId: string) => deleteMerchantGroup(userId, groupId),
    onSuccess: invalidate,
  });
}

export function useAddToMerchantGroup() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const invalidate = useInvalidateMerchantData();

  return useMutation({
    mutationFn: ({
      groupId,
      alias,
      movementId,
    }: {
      groupId: string;
      alias: string;
      movementId: string;
    }) => addAliasToGroup(userId, groupId, alias, movementId),
    onSuccess: invalidate,
  });
}

export function useRemoveMerchantGroupAlias() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const invalidate = useInvalidateMerchantData();

  return useMutation({
    mutationFn: ({
      groupId,
      alias,
      movementId,
    }: {
      groupId: string;
      alias: string;
      movementId: string;
    }) => removeAliasFromGroup(userId, groupId, alias, movementId),
    onSuccess: invalidate,
  });
}

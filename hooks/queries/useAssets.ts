import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { invalidateAssetsQueries } from '@/lib/api/invalidate-queries';
import {
  createGoal,
  createInventoryItem,
  createWarranty,
  deleteGoal,
  deleteInventoryItem,
  deleteWarranty,
  fetchAssetsData,
  updateGoal,
  updateInventoryItem,
  updateWarranty,
} from '@/lib/api/services/assets.service';
import { useAuth } from '@/lib/auth';
import { logDoctorMutationFailure } from '@/lib/doctor';
import type { AssetsData } from '@/lib/domain/assets.types';
import type {
  CreateGoalInput,
  CreateInventoryItemInput,
  CreateWarrantyInput,
  UpdateGoalInput,
  UpdateInventoryItemInput,
  UpdateWarrantyInput,
} from '@/lib/domain/assets.schema';

export { invalidateAssetsQueries };

export function useAssets() {
  const { isAuthenticated } = useAuth();

  return useQuery<AssetsData>({
    queryKey: queryKeys.assets,
    queryFn: fetchAssetsData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal(input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: 'goal_create',
        screen: 'GoalFormModal',
        payload: { name: variables.name },
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) => updateGoal(id, input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: 'goal_update',
        screen: 'GoalFormModal',
        payload: { id: variables.id },
      });
    },
  });
}

export function useCreateWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWarrantyInput) => createWarranty(input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: 'warranty_create',
        screen: 'WarrantyFormModal',
        payload: { product: variables.product },
      });
    },
  });
}

export function useUpdateWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWarrantyInput }) =>
      updateWarranty(id, input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, variables) => {
      logDoctorMutationFailure(error, {
        action: 'warranty_update',
        screen: 'WarrantyFormModal',
        payload: { id: variables.id },
      });
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInventoryItemInput) => createInventoryItem(input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInventoryItemInput }) =>
      updateInventoryItem(id, input),
    onSuccess: () => invalidateAssetsQueries(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, id) => {
      logDoctorMutationFailure(error, {
        action: 'goal_delete',
        screen: 'GoalsSection',
        payload: { id },
      });
    },
  });
}

export function useDeleteWarranty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWarranty(id),
    onSuccess: () => invalidateAssetsQueries(queryClient),
    onError: (error, id) => {
      logDoctorMutationFailure(error, {
        action: 'warranty_delete',
        screen: 'WarrantySection',
        payload: { id },
      });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => invalidateAssetsQueries(queryClient),
  });
}

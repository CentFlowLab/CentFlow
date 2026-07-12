import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import {
  createBankLink,
  fetchBankConnections,
  fetchSupportedBanks,
  finalizeBankLink,
  revokeBankConnection,
  syncBankConnection,
} from '@/lib/open-banking/gocardless.service';
import { useAuth } from '@/lib/auth';

export function useSupportedBanks() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.openBankingInstitutions,
    queryFn: fetchSupportedBanks,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60,
  });
}

export function useBankConnections() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.bankConnections,
    queryFn: fetchBankConnections,
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

export function useCreateBankLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (institutionId: string) => createBankLink(institutionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
    },
  });
}

export function useFinalizeBankLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requisitionId: string) => finalizeBankLink(requisitionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
    },
  });
}

export function useRevokeBankConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => revokeBankConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
    },
  });
}

export function useSyncBankConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => syncBankConnection(connectionId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bankConnections });
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      }
    },
  });
}

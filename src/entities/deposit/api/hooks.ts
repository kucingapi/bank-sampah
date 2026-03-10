import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import {
  listDeposits,
  getDepositWithItems,
  createDeposit,
  updateDeposit,
} from './queries';

export function useDeposits(eventId?: string) {
  return useQuery({
    queryKey: eventId ? queryKeys.deposits.byEvent(eventId) : queryKeys.deposits.all,
    queryFn: () => listDeposits(eventId),
  });
}

export function useDeposit(id: string) {
  return useQuery({
    queryKey: queryKeys.deposits.detail(id),
    queryFn: () => getDepositWithItems(id),
    enabled: !!id,
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      memberId,
      totalPayout,
      items,
    }: {
      eventId: string;
      memberId: number;
      totalPayout: number;
      items: { categoryId: string; weight: number }[];
    }) => createDeposit(eventId, memberId, totalPayout, items),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.breakdown() });
    },
  });
}

export function useUpdateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      depositId,
      memberId,
      totalPayout,
      items,
    }: {
      depositId: string;
      eventId: string;
      memberId: number;
      totalPayout: number;
      items: { categoryId: string; weight: number }[];
    }) => updateDeposit(depositId, memberId, totalPayout, items),
    onSuccess: (_, { depositId, eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits.detail(depositId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}

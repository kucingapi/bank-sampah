import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEventStatus,
  syncEventRates,
  getEventRates,
  updateEventRate,
  getEventCategoryTotals,
} from './queries';
import type { Event } from '../model/types';

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: listEvents,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => getEvent(id),
    enabled: !!id,
  });
}

export function useActiveEvent() {
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events.list(),
    queryFn: listEvents,
  });
  return events.find((e: Event) => e.status === 'active') || null;
}

export function useEventRates(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.rates(eventId),
    queryFn: () => getEventRates(eventId),
    enabled: !!eventId,
  });
}

export function useEventCategoryTotals(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.categoryTotals(eventId),
    queryFn: () => getEventCategoryTotals(eventId),
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => createEvent(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'finished' }) =>
      updateEventStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
    },
  });
}

export function useSyncEventRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => syncEventRates(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.rates(eventId) });
    },
  });
}

export function useUpdateEventRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      categoryId,
      activeRate,
      isActive,
    }: {
      eventId: string;
      categoryId: string;
      activeRate: number;
      isActive: number;
    }) => updateEventRate(eventId, categoryId, activeRate, isActive),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.rates(eventId) });
    },
  });
}

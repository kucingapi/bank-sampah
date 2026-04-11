import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listManifests, createManifest, createManifestsByAssignments, deleteManifestsByEvent, hasManifest } from './queries';

export function useManifests(eventId: string) {
  return useQuery({
    queryKey: queryKeys.manifests.byEvent(eventId),
    queryFn: () => listManifests(eventId),
    enabled: !!eventId,
  });
}

export function useCreateManifest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      vendorId,
      items,
    }: {
      eventId: string;
      vendorId: number;
      items: { category_id: string; outbound_rate: number; weight: number }[];
    }) => createManifest(eventId, vendorId, items),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.byEvent(eventId) });
    },
  });
}

export function useDeleteManifestsByEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteManifestsByEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.byEvent(eventId) });
    },
  });
}

export function useCreateManifestsByAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      assignments,
    }: {
      eventId: string;
      assignments: { vendorId: number; items: { category_id: string; outbound_rate: number; weight: number }[] }[];
    }) => createManifestsByAssignments(eventId, assignments),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manifests.byEvent(eventId) });
    },
  });
}

export function useHasManifest(eventId: string) {
  return useQuery({
    queryKey: [...queryKeys.manifests.byEvent(eventId), 'exists'],
    queryFn: () => hasManifest(eventId),
    enabled: !!eventId,
  });
}

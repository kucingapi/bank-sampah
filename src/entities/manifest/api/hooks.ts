import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listManifests, createManifest, deleteManifestsByEvent } from './queries';

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
      vendorId: string;
      items: { category_id: string; outbound_rate: number }[];
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

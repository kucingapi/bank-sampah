import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listVendors, createVendor } from './queries';

export function useVendors(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.vendors.all, search],
    queryFn: () => listVendors(search),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createVendor(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}

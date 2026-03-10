import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listMembers, createMember, getMemberEarnings } from './queries';

export function useMembers(filters?: { search?: string; dateStart?: string; dateEnd?: string }) {
  return useQuery({
    queryKey: queryKeys.members.list(filters),
    queryFn: () => listMembers(filters?.search, filters?.dateStart, filters?.dateEnd),
  });
}

export function useMemberEarnings(memberId: number) {
  return useQuery({
    queryKey: queryKeys.members.earnings(memberId),
    queryFn: () => getMemberEarnings(memberId),
    enabled: !!memberId,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createMember(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listMembers, createMember, getMemberEarnings, exportDetailedMemberList, updateMember } from './queries';

export function useMembers(filters?: { search?: string; eventDateStart?: string; eventDateEnd?: string }) {
  return useQuery({
    queryKey: queryKeys.members.list(filters),
    queryFn: () => listMembers(filters?.search, filters?.eventDateStart, filters?.eventDateEnd),
  });
}

export function useExportDetailedMemberList() {
  return useMutation({
    mutationFn: (filters?: { eventDateStart?: string; eventDateEnd?: string }) => 
      exportDetailedMemberList(filters?.eventDateStart, filters?.eventDateEnd),
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
    mutationFn: ({ name, address, phone }: { name: string; address?: string; phone?: string }) =>
      createMember(name, address, phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<{ name: string; address: string; phone: string }> }) =>
      updateMember(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
  });
}
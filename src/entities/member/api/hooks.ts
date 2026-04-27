import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { listMembers, createMember, getMemberEarnings, exportDetailedMemberList, updateMember, deleteMember, isMemberIdTaken, updateMemberId } from './queries';

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
    mutationFn: ({ name, address, phone, id }: { name: string; address?: string; phone?: string; id?: number }) =>
      createMember(name, address, phone, id),
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

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
  });
}

export function useIsMemberIdTaken() {
  return useMutation({
    mutationFn: ({ id, excludeId }: { id: number; excludeId?: number }) =>
      isMemberIdTaken(id, excludeId),
  });
}

export function useUpdateMemberId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ oldId, newId }: { oldId: number; newId: number }) =>
      updateMemberId(oldId, newId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits.all });
    },
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import {
  getMemberSemesterSavings,
  getSemesterSavings,
  upsertSemesterSavings,
  deleteSemesterSavings,
} from './queries';

const semesterSavingsKeys = {
  all: ['semester-savings'] as const,
  byMember: (memberId: number) =>
    [...semesterSavingsKeys.all, 'member', memberId] as const,
  byMemberAndSemester: (memberId: number, semesterLabel: string) =>
    [...semesterSavingsKeys.byMember(memberId), 'semester', semesterLabel] as const,
};

/**
 * Get all savings records for a member.
 */
export function useMemberSemesterSavings(memberId: number) {
  return useQuery({
    queryKey: semesterSavingsKeys.byMember(memberId),
    queryFn: () => getMemberSemesterSavings(memberId),
    enabled: memberId > 0,
  });
}

/**
 * Get savings for a specific member + semester.
 */
export function useSemesterSavings(memberId: number, semesterLabel: string) {
  return useQuery({
    queryKey: semesterSavingsKeys.byMemberAndSemester(memberId, semesterLabel),
    queryFn: () => getSemesterSavings(memberId, semesterLabel),
    enabled: memberId > 0 && !!semesterLabel,
  });
}

/**
 * Mutation to upsert semester savings.
 */
export function useUpsertSemesterSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      semesterLabel,
      savedAmount,
      isSaved,
      rolledFrom,
    }: {
      memberId: number;
      semesterLabel: string;
      savedAmount: number;
      isSaved: boolean;
      rolledFrom: string | null;
    }) =>
      upsertSemesterSavings(memberId, semesterLabel, savedAmount, isSaved, rolledFrom),
    onSuccess: (_data, variables) => {
      // Invalidate everything related to pembayaran anggota
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Mutation to delete a semester savings record.
 */
export function useDeleteSemesterSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSemesterSavings(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semesterSavingsKeys.all });
    },
  });
}

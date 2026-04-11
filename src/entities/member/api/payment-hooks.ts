import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getSemesterDateRange, type SemesterLabel } from '@/shared/lib/semester';
import {
  getMemberPaymentPivot,
  getMemberPaymentDetails,
  getEventsInRange,
  exportMemberPaymentPivot,
  getMemberSemesterPivot,
  getSemesterSummary,
} from './payment-queries';
import type { MemberPaymentPivot, MemberPaymentDetail, MemberSemesterPayment } from './payment-queries';

export function useMemberPaymentPivot(filters?: { eventDateStart?: string; eventDateEnd?: string }) {
  return useQuery<MemberPaymentPivot[]>({
    queryKey: queryKeys.members.paymentList(filters),
    queryFn: () => getMemberPaymentPivot(filters?.eventDateStart, filters?.eventDateEnd),
  });
}

export function useEventsInRange(filters?: { eventDateStart?: string; eventDateEnd?: string }) {
  return useQuery<{ id: string; event_date: string }[]>({
    queryKey: ['events', 'range', filters],
    queryFn: () => getEventsInRange(filters?.eventDateStart, filters?.eventDateEnd),
    enabled: !!(filters?.eventDateStart && filters?.eventDateEnd),
  });
}

export function useMemberPaymentDetails(memberId: number, filters?: { eventDateStart?: string; eventDateEnd?: string }) {
  return useQuery<MemberPaymentDetail[]>({
    queryKey: [...queryKeys.members.all, 'paymentDetails', memberId, filters],
    queryFn: () => getMemberPaymentDetails(memberId, filters?.eventDateStart, filters?.eventDateEnd),
    enabled: !!memberId,
  });
}

export function useExportMemberPaymentPivot() {
  return useMutation({
    mutationFn: ({
      events,
      pivotData,
    }: {
      events: { id: string; event_date: string }[];
      pivotData: MemberPaymentPivot[];
    }) => exportMemberPaymentPivot(events, pivotData),
  });
}

// ── Semester-based hooks ──────────────────────────────────────────────────

export function useMemberSemesterPivot(semesterLabel: SemesterLabel) {
  return useQuery<MemberSemesterPayment[]>({
    queryKey: [...queryKeys.members.all, 'semesterPivot', semesterLabel],
    queryFn: () => getMemberSemesterPivot(semesterLabel),
    enabled: !!semesterLabel,
  });
}

export function useSemesterSummary(semesterLabel: SemesterLabel) {
  return useQuery({
    queryKey: [...queryKeys.members.all, 'semesterSummary', semesterLabel],
    queryFn: () => getSemesterSummary(semesterLabel),
    enabled: !!semesterLabel,
  });
}

export function useSemesterEvents(semesterLabel: SemesterLabel) {
  return useQuery<{ id: string; event_date: string }[]>({
    queryKey: ['events', 'semester', semesterLabel],
    queryFn: async () => {
      if (!semesterLabel) return [];
      const { startDate, endDate } = getSemesterDateRange(semesterLabel);
      return getEventsInRange(startDate, endDate);
    },
    enabled: !!semesterLabel,
  });
}

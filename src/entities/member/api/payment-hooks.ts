import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getMemberPaymentPivot, getMemberPaymentDetails, getEventsInRange, exportMemberPaymentPivot } from './payment-queries';
import type { MemberPaymentPivot, MemberPaymentDetail } from './payment-queries';

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

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getDashboardStats, getCategoryBreakdown } from './queries';

export function useDashboardStats(dateStart?: string, dateEnd?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(dateStart, dateEnd),
    queryFn: () => getDashboardStats(dateStart, dateEnd),
  });
}

export function useCategoryBreakdown(dateStart?: string, dateEnd?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.breakdown(dateStart, dateEnd),
    queryFn: () => getCategoryBreakdown(dateStart, dateEnd),
  });
}

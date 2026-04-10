import { DashboardApi } from '@/api';
import { DashboardAlertsResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch dashboard alerts
 */
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async (): Promise<DashboardAlertsResponse> => {
      return DashboardApi.getAlerts();
    },
    staleTime: 1 * 60 * 1000, // 1 minute (alerts should be more frequently updated)
  });
}

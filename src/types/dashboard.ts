export type DashboardTimeFilter = '7' | '30' | '90';

export interface DashboardStats {
  totalBooks: number;
  totalBookCopies: number;
  totalUsers: number;
  activeBorrows: number;
  overdueBorrows: number;
  totalEbooks: number;
  pendingBorrowRequests: number;
  totalRevenue: number;
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
}

export type AlertSeverity = 'info' | 'warning' | 'error';

export interface DashboardAlert {
  id: number;
  title: string;
  description: string;
  count: number;
  severity: AlertSeverity;
}

export interface DashboardAlertsResponse {
  alerts: DashboardAlert[];
}

export interface BorrowingTrendDataPoint {
  label: string;
  value: number;
}

export interface BorrowingTrendResponse {
  data: BorrowingTrendDataPoint[];
  timeFilter: DashboardTimeFilter;
  periodStart: Date;
  periodEnd: Date;
}

export interface UserDistributionDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface UserDistributionResponse {
  data: UserDistributionDataPoint[];
}

export interface BookCopiesDistributionDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BookCopiesDistributionResponse {
  data: BookCopiesDistributionDataPoint[];
}

export interface BorrowRequestDistributionDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BorrowRequestDistributionResponse {
  data: BorrowRequestDistributionDataPoint[];
}

export interface TopBorrowedBookItem {
  id: number;
  title: string;
  subtitle: string;
  value: number;
  rank: number;
}

export interface TopBorrowedBooksResponse {
  items: TopBorrowedBookItem[];
}

export interface TopActiveUserItem {
  id: number;
  title: string;
  subtitle: string;
  value: number;
  rank: number;
}

export interface TopActiveUsersResponse {
  items: TopActiveUserItem[];
}

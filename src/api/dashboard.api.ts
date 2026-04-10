import { fetchWithAuth, handleJson } from '@/lib/utils';
import {
  BookCopiesDistributionResponse,
  BorrowRequestDistributionResponse,
  BorrowingTrendResponse,
  DashboardAlertsResponse,
  DashboardStatsResponse,
  TopActiveUsersResponse,
  TopBorrowedBooksResponse,
  UserDistributionResponse,
} from '@/types/dashboard';

export class DashboardApi {
  /**
   * Get dashboard statistics
   * @returns Dashboard statistics response
   */
  static async getStats(): Promise<DashboardStatsResponse> {
    const response = await fetchWithAuth('/api/dashboard/stats');

    return await handleJson<DashboardStatsResponse>(response);
  }

  /**
   * Get dashboard alerts that need immediate attention
   * @returns Dashboard alerts response
   */
  static async getAlerts(): Promise<DashboardAlertsResponse> {
    const response = await fetchWithAuth('/api/dashboard/alerts');
    return await handleJson<DashboardAlertsResponse>(response);
  }

  /**
   * Get borrowing trend data for the last 7 days
   * @returns Borrowing trend response with data points for chart
   */
  static async getBorrowingTrend(): Promise<BorrowingTrendResponse> {
    const response = await fetchWithAuth('/api/dashboard/borrowing-trend');

    return await handleJson<BorrowingTrendResponse>(response);
  }

  /**
   * Get user distribution by role
   * @returns User distribution response with data points for pie chart
   */
  static async getUserDistribution(): Promise<UserDistributionResponse> {
    const response = await fetchWithAuth('/api/dashboard/user-distribution');

    return await handleJson<UserDistributionResponse>(response);
  }

  /**
   * Get book copies distribution by status
   * @returns Book copies distribution response with data points for bar chart
   */
  static async getBookCopiesDistribution(): Promise<BookCopiesDistributionResponse> {
    const response = await fetchWithAuth('/api/dashboard/book-copies-distribution');

    return await handleJson<BookCopiesDistributionResponse>(response);
  }

  /**
   * Get borrow request distribution by status
   * @returns Borrow request distribution response with data points for bar chart
   */
  static async getBorrowRequestDistribution(): Promise<BorrowRequestDistributionResponse> {
    const response = await fetchWithAuth('/api/dashboard/borrow-request-distribution');

    return await handleJson<BorrowRequestDistributionResponse>(response);
  }

  /**
   * Get top 10 most borrowed books
   * @returns Top borrowed books response with items for TopList component
   */
  static async getTopBorrowedBooks(): Promise<TopBorrowedBooksResponse> {
    const response = await fetchWithAuth('/api/dashboard/top-borrowed-books');

    return await handleJson<TopBorrowedBooksResponse>(response);
  }

  /**
   * Get top 5 most active users
   * @returns Top active users response with items for TopList component
   */
  static async getTopActiveUsers(): Promise<TopActiveUsersResponse> {
    const response = await fetchWithAuth('/api/dashboard/top-active-users');

    return await handleJson<TopActiveUsersResponse>(response);
  }
}

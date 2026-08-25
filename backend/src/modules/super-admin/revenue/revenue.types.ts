export type RevenueQuery = {
  from?: string;
  to?: string;
};

export type RevenueOverview = {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
};

export type RevenueChartItem = {
  period: string; // YYYY-MM or YYYY
  revenue: number;
  transactions: number;
};

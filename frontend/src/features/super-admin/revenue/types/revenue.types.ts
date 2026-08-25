export type RevenueChartItem = {
  period: string; // YYYY-MM or YYYY
  revenue: number;
  transactions: number;
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

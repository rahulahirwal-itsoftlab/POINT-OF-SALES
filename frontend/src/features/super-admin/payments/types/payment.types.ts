export type PaymentListItem = {
  payment: {
    id: string;
    amount: string;
    currency: string;
    method: string;
    status: string;
    transactionReference: string | null;
    createdAt: string;
  };
  restaurant: {
    name: string;
    publicId: string;
  };
  subscription?: {
    id: string;
    billingCycle: string;
  };
};

export type ListPaymentsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
};

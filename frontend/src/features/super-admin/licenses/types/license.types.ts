export interface License {
  id: string;
  licenseKey: string;
  restaurantId: string;
  subscriptionId: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "BLOCKED" | "CANCELLED" | "REVOKED";
  issuedAt: string;
  expiresAt: string;
}

export interface LicenseWithRelations {
  license: License;
  restaurant: {
    id: string;
    name: string;
  };
  plan: {
    id: string;
    name: string;
  };
  subscription: {
    id: string;
    status: string;
  };
}

export interface LicenseListResponse {
  success: boolean;
  message: string;
  data: LicenseWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

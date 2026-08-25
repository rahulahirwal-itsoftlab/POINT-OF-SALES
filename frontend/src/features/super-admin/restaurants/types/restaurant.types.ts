export type CreateRestaurantInput = {
  restaurant: {
    name: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    address?: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    taxNumber?: string;
    businessType: "RESTAURANT" | "CAFE" | "HOTEL" | "CLOUD_KITCHEN" | "BAKERY" | "FAST_FOOD" | "BAR" | "OTHER";
    cuisineType?: string;
    timezone: string;
    currency: string;
    logo?: string;
    website?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  };
  admin: {
    name: string;
    email: string;
    loginEmail?: string;
    phone?: string;
    loginPassword: string;
    confirmPassword: string;
  };
  subscription: {
    planType?: "PREDEFINED" | "CUSTOMIZED";
    planId?: string;
    billingCycle: "MONTHLY" | "YEARLY";
    price?: number;
    customPrice?: number;
    currency?: string;
    startDate: string;
    durationMonths?: number;
    endDate?: string;
    renewalDate?: string;
    customPlan?: {
      name: string;
      description?: string;
      basePrice: number;
      gstPercentage: number;
      waiterLimit: number;
      kitchenLimit: number;
      receptionistLimit: number;
      staffLimit?: number;
      features: string[];
    };
  };
  license?: {
    startDate?: string;
    expiryDate?: string;
    renewalDate?: string;
    status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "BLOCKED" | "CANCELLED" | "REVOKED";
  };
};

export type UpdateRestaurantInput = Partial<CreateRestaurantInput>;

export type RestaurantSummary = {
  id: string;
  publicId: string;
  organizationId?: string;
  code?: string;
  name: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  taxNumber?: string | null;
  businessType?: string | null;
  cuisineType?: string | null;
  timezone?: string | null;
  currency?: string | null;
  logo?: string | null;
  website?: string | null;
  status: string;
  subscriptionStatus?: string | null;
  subscriptionBillingCycle?: string | null;
  subscriptionExpiry?: string | null;
  licenseStatus?: string | null;
  licenseKey?: string | null;
  licenseIssuedAt?: string | null;
  licenseExpiry?: string | null;
  createdAt: string;
  updatedAt?: string;
};

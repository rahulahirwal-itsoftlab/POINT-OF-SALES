export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "WAITER" | "KITCHEN" | "RECEPTION";
  subjectType?: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  status: string;
  isActive: boolean;
  permissions: string[];
  organizationId?: string | null;
  restaurantId?: string | null;
  organizationIds?: string[];
  restaurantIds: string[];
  lastLoginAt?: string | null;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

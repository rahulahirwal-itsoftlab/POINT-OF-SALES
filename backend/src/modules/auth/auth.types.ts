export type LoginInput = {
  email: string;
  password: string;
};

export type RequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuthSubjectType = "FRANCHISE_STEWARD" | "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

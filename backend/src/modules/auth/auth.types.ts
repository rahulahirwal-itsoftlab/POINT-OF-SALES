export type LoginInput = {
  email: string;
  password: string;
};

export type RequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuthSubjectType = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

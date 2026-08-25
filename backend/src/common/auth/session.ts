export type AuthenticatedUser = {
  id: string;
  publicId: string;
  email: string;
  role: string;
  permissions: string[];
  restaurantIds: string[];
};

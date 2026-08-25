import { apiClient } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
};

export async function login(input: LoginRequest) {
  const response = await apiClient.post("/auth/login", input);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get("/auth/me");
  return response.data;
}

export async function logout() {
  const response = await apiClient.post("/auth/logout");
  return response.data;
}

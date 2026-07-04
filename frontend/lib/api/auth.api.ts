import apiClient from "./client";
import { ApiResponse, AuthResponse, User } from "@/types";

export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string;
    business_name?: string;
    country?: string;
  }) => {
    const res = await apiClient.post<ApiResponse>("/auth/register", data);
    return res.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const res = await apiClient.post<ApiResponse>("/auth/verify-otp", data);
    return res.data;
  },

  resendOtp: async (email: string) => {
    const res = await apiClient.post<ApiResponse>("/auth/resend-otp", { email });
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", data);
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get<ApiResponse<User>>("/auth/me");
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post<ApiResponse>("/auth/logout");
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post<ApiResponse>("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (data: { token: string; new_password: string }) => {
    const res = await apiClient.post<ApiResponse>("/auth/reset-password", data);
    return res.data;
  },
};
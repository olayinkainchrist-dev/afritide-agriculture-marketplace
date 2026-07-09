import apiClient from "./client";
import { ApiResponse, PaginatedResponse, Product } from "@/types";

export const productsApi = {
  list: async (params?: {
    search?: string;
    category?: string;
    country?: string;
    min_price?: number;
    max_price?: number;
    is_organic?: boolean;
    is_export_ready?: boolean;
    is_featured?: boolean;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Product>>("/products", { params });
    return res.data;
  },

  getFeatured: async (limit = 12) => {
    const res = await apiClient.get<ApiResponse<Product[]>>("/products/featured", { params: { limit } });
    return res.data;
  },

  getByCategory: async (category: string, params?: { page?: number; page_size?: number }) => {
    const res = await apiClient.get<PaginatedResponse<Product>>(`/products/category/${category}`, { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return res.data;
  },

  getMyProducts: async (params?: { status?: string; page?: number; page_size?: number }) => {
    const res = await apiClient.get<PaginatedResponse<Product>>("/products/seller/my-products", { params });
    return res.data;
  },

  create: async (data: Partial<Product>) => {
    const res = await apiClient.post<ApiResponse<Product>>("/products", data);
    return res.data;
  },

  update: async (id: string, data: Partial<Product>) => {
    const res = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await apiClient.delete<ApiResponse>(`/products/${id}`);
    return res.data;
  },

  toggleWishlist: async (id: string) => {
    const res = await apiClient.post<ApiResponse<{ wishlisted: boolean }>>(`/products/${id}/wishlist`);
    return res.data;
  },

  uploadImages: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await apiClient.post<ApiResponse>(`/products/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
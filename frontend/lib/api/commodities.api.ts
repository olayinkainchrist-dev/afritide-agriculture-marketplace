import apiClient from "./client";
import { ApiResponse, PaginatedResponse, CommodityPrice } from "@/types";

export const commoditiesApi = {
  list: async (params?: {
    category?: string;
    country?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const res = await apiClient.get<PaginatedResponse<CommodityPrice>>("/commodities", { params });
    return res.data;
  },

  getHistory: async (id: string, days = 30) => {
    const res = await apiClient.get<ApiResponse>(`/commodities/${id}/history`, { params: { days } });
    return res.data;
  },
};
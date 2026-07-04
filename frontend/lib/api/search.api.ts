import apiClient from "./client";
import { ApiResponse } from "@/types";

export const searchApi = {
  search: async (q: string, type = "all") => {
    const res = await apiClient.get<ApiResponse>("/search", { params: { q, type } });
    return res.data;
  },

  autocomplete: async (q: string) => {
    const res = await apiClient.get<ApiResponse<string[]>>("/search/autocomplete", { params: { q } });
    return res.data;
  },
};
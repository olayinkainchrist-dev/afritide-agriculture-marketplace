import apiClient from "./client";
import { CartItem } from "@/lib/store/cart.store";

export const cartApi = {
  get: async () => {
    const res = await apiClient.get("/cart");
    return res.data;
  },

  addItem: async (product_id: string, quantity: number) => {
    const res = await apiClient.post("/cart/items", { product_id, quantity });
    return res.data;
  },

  updateItem: async (item_id: string, quantity: number) => {
    const res = await apiClient.put(`/cart/items/${item_id}`, { quantity });
    return res.data;
  },

  removeItem: async (item_id: string) => {
    const res = await apiClient.delete(`/cart/items/${item_id}`);
    return res.data;
  },

  clear: async () => {
    const res = await apiClient.delete("/cart");
    return res.data;
  },
};
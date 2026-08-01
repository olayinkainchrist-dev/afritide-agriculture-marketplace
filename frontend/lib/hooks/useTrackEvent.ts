import { useCallback } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import apiClient from "@/lib/api/client";

export function useTrackEvent() {
  const { isAuthenticated } = useAuthStore();

  const track = useCallback(async (
    eventType: "view" | "search" | "cart_add" | "wishlist" | "purchase",
    data: {
      product_id?:   string;
      category?:     string;
      search_query?: string;
    }
  ) => {
    if (!isAuthenticated) return;
    try {
      await apiClient.post("/recommendations/track", {
        event_type:   eventType,
        product_id:   data.product_id,
        category:     data.category,
        search_query: data.search_query,
        session_id:   sessionStorage.getItem("session_id") || undefined,
      });
    } catch {
      // silent fail — never block UI for tracking
    }
  }, [isAuthenticated]);

  return { track };
}
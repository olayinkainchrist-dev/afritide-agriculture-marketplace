import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id:         string;
  product_id: string;
  title:      string;
  main_image: string | null;
  price:      number;
  currency:   string;
  unit:       string;
  quantity:   number;
  item_total: number;
  seller_id:  string;
  min_order:  number;
  max_order:  number;
  country:    string | null;
}

interface CartStore {
  items:      CartItem[];
  isOpen:     boolean;
  setItems:   (items: CartItem[]) => void;
  setIsOpen:  (open: boolean) => void;
  clearCart:  () => void;
  itemCount:  () => number;
  subtotal:   () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items:     [],
      isOpen:    false,
      setItems:  (items) => set({ items }),
      setIsOpen: (open) => set({ isOpen: open }),
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.length,
      subtotal:  () => get().items.reduce((sum, item) => sum + item.item_total, 0),
    }),
    { name: "afritide-cart" }
  )
);
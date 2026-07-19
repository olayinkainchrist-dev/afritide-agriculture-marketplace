"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useCartStore } from "@/lib/store/cart.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { cartApi } from "@/lib/api/cart.api";
import {
  Trash2, Plus, Minus, ShoppingCart,
  ArrowRight, Loader2, Package,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { useCurrencyStore } from "@/lib/store/currency.store";
import toast from "react-hot-toast";

export default function CartPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { items, setItems }              = useCartStore();
  const router                           = useRouter();
  const { format }                       = useCurrencyStore();
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadCart();
  }, [hasHydrated, isAuthenticated]);

  const loadCart = async () => {
    try {
      const res = await cartApi.get();
      setItems(res.data?.items || []);
    } catch {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (item_id: string, quantity: number) => {
    setUpdating(item_id);
    try {
      const res = await cartApi.updateItem(item_id, quantity);
      setItems(res.data?.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (item_id: string) => {
    setUpdating(item_id);
    try {
      const res = await cartApi.removeItem(item_id);
      setItems(res.data?.items || []);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setUpdating(null);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear all items from cart?")) return;
    try {
      await cartApi.clear();
      setItems([]);
      toast.success("Cart cleared");
    } catch {
      toast.error("Failed to clear cart");
    }
  };

  if (!hasHydrated) return null;

  const subtotal = items.reduce((sum, item) => sum + item.item_total, 0);
  const currency = items[0]?.currency || "NGN";

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Shopping Cart</h1>
          <p className="text-gray-500 text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <ShoppingCart className="w-10 h-10 text-gray-700" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Your cart is empty</h2>
            <p className="text-gray-600 text-sm mb-6">Browse the marketplace to find products</p>
            <Link href="/marketplace"
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0">
                    {item.main_image ? (
                      <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-700" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-bold text-sm truncate">{item.title}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">{item.country || "—"}</p>
                      </div>
                      <button onClick={() => handleRemove(item.id)} disabled={updating === item.id}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                        {updating === item.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, Math.max(item.min_order, item.quantity - 1))}
                          disabled={updating === item.id || item.quantity <= item.min_order}
                          className="px-3 py-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 py-2 text-white text-sm font-bold min-w-[40px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, Math.min(item.max_order, item.quantity + 1))}
                          disabled={updating === item.id || item.quantity >= item.max_order}
                          className="px-3 py-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-green-400 font-black">{format(item.item_total, item.currency)}</p>
                        <p className="text-gray-600 text-xs">{format(item.price, item.currency)} / {item.unit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={handleClear}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                Clear cart
              </button>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 sticky top-24">
                <h2 className="text-white font-bold text-lg mb-5">Order Summary</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({items.length} items)</span>
                    <span className="text-white font-medium">{format(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee</span>
                    <span className="text-green-400">Included</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-white/[0.07] pt-3 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-green-400 font-black text-lg">
                      {format(subtotal, currency)}
                    </span>
                  </div>
                </div>

                <button onClick={() => router.push("/checkout")}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30">
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>

                <Link href="/marketplace"
                  className="block text-center text-gray-500 hover:text-white text-sm mt-4 transition-colors">
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
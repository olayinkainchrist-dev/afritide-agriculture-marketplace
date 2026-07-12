"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useCartStore } from "@/lib/store/cart.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { cartApi } from "@/lib/api/cart.api";
import apiClient from "@/lib/api/client";
import {
  Loader2, ArrowLeft, CheckCircle2,
  MapPin, Package, Shield,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { items, setItems, clearCart } = useCartStore();
  const router = useRouter();
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderDone,  setOrderDone]  = useState(false);
  const [orderId,    setOrderId]    = useState<string | null>(null);
  const [form, setForm] = useState({
    shipping_address: "",
    shipping_city:    "",
    shipping_country: "Nigeria",
    shipping_method:  "standard",
    buyer_notes:      "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadCart();
  }, [isAuthenticated]);

  // Load Paystack inline script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  const subtotal    = items.reduce((sum, item) => sum + item.item_total, 0);
  const total       = subtotal; // Buyer pays subtotal only
  const platformFee = subtotal * 0.05; // Deducted from seller — not added to buyer
  const currency    = items[0]?.currency || "NGN";

  const handlePaystackSuccess = async (response: any) => {
    setProcessing(true);
    try {
      const res = await apiClient.post("/payments/paystack/verify", {
        reference:        response.reference,
        cart_items:       items,
        shipping_address: {
          address: form.shipping_address,
          city:    form.shipping_city,
          country: form.shipping_country,
        },
        shipping_method: form.shipping_method,
        buyer_notes:     form.buyer_notes || undefined,
      });

      if (res.data?.success) {
        setOrderId(res.data?.data?.order_id);
        setOrderDone(true);
        clearCart();
        await cartApi.clear();
      } else {
        toast.error("Payment verified but order creation failed. Contact support.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to process order");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (!form.shipping_address || !form.shipping_city) {
      toast.error("Please enter your shipping address");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const reference = `AFR-${Date.now()}`;

    const handler = (window as any).PaystackPop.setup({
      key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email:    user?.email,
      amount:   Math.round(total * 100),
      currency: "NGN",
      reference,
      metadata: {
        custom_fields: [
          { display_name: "Buyer Name", variable_name: "buyer_name", value: `${user?.first_name} ${user?.last_name}` },
          { display_name: "Platform",   variable_name: "platform",   value: "Afritide" },
        ],
      },
      callback: (response: any) => handlePaystackSuccess(response),
      onClose:  () => toast("Payment cancelled"),
    });

    handler.openIframe();
  };

  // Order success screen
  if (orderDone) {
    return (
      <main className="min-h-screen bg-[#060f08]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Order Confirmed!</h1>
          <p className="text-gray-400 mb-2">Your payment was successful.</p>
          <p className="text-gray-500 text-sm mb-8">
            Order ID: <span className="text-green-400 font-bold">{orderId}</span>
          </p>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-left mb-8">
            <p className="text-gray-400 text-sm leading-relaxed">
              ✅ Payment received and confirmed<br />
              📧 Confirmation email sent to {user?.email}<br />
              🚚 Seller has been notified to process your order<br />
              📦 Track your order in your dashboard
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/buyer/orders"
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              View My Orders
            </Link>
            <Link href="/marketplace"
              className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
              Continue Shopping
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/cart" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white">Checkout</h1>
            <p className="text-gray-500 text-sm">{items.length} item{items.length !== 1 ? "s" : ""} in your order</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link href="/marketplace" className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left — Shipping form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Shipping address */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" /> Shipping Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Street Address *</label>
                    <input
                      value={form.shipping_address}
                      onChange={e => setForm({ ...form, shipping_address: e.target.value })}
                      placeholder="e.g. 12 Lagos Road, Ikeja"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">City *</label>
                      <input
                        value={form.shipping_city}
                        onChange={e => setForm({ ...form, shipping_city: e.target.value })}
                        placeholder="e.g. Lagos"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                      <input
                        value={form.shipping_country}
                        onChange={e => setForm({ ...form, shipping_country: e.target.value })}
                        placeholder="e.g. Nigeria"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping method */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-500" /> Shipping Method
                </h2>
                <div className="space-y-3">
                  {[
                    { value: "standard", label: "Standard Delivery", desc: "7-14 business days",          price: "Free" },
                    { value: "express",  label: "Express Delivery",  desc: "3-5 business days",           price: "Negotiated with seller" },
                    { value: "pickup",   label: "Farm Pickup",       desc: "Pick up directly from farm",  price: "Free" },
                  ].map(method => (
                    <label key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        form.shipping_method === method.value
                          ? "border-green-600/60 bg-green-950/30"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
                      }`}>
                      <input type="radio" name="shipping_method" value={method.value}
                        checked={form.shipping_method === method.value}
                        onChange={e => setForm({ ...form, shipping_method: e.target.value })}
                        className="accent-green-500" />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{method.label}</p>
                        <p className="text-gray-500 text-xs">{method.desc}</p>
                      </div>
                      <span className="text-green-400 text-sm font-bold">{method.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">Order Notes (optional)</h2>
                <textarea
                  value={form.buyer_notes}
                  onChange={e => setForm({ ...form, buyer_notes: e.target.value })}
                  rows={3}
                  placeholder="Special instructions, delivery preferences..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Right — Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 sticky top-24 space-y-5">
                <h2 className="text-white font-bold text-lg">Order Summary</h2>

                {/* Items */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] flex-shrink-0">
                        {item.main_image
                          ? <img src={item.main_image} alt={item.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-700" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                        <p className="text-gray-600 text-[10px]">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-green-400 text-xs font-bold flex-shrink-0">
                        {formatPrice(item.item_total, item.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.07] pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-white">{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service fee</span>
                    <span className="text-green-400">Included</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="border-t border-white/[0.07] pt-3 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-green-400 font-black text-xl">{formatPrice(total, currency)}</span>
                  </div>
                </div>

                <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-gray-400 text-xs">Secured by Paystack. Your payment is protected.</p>
                </div>

                <button onClick={handleCheckout} disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <>Pay {formatPrice(total, currency)}</>
                  }
                </button>

                <p className="text-gray-600 text-xs text-center">
                  By completing this purchase you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

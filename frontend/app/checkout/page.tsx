"use client";
import { useEffect, useState, Suspense } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useCartStore } from "@/lib/store/cart.store";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { cartApi } from "@/lib/api/cart.api";
import apiClient from "@/lib/api/client";
import {
  Loader2, ArrowLeft, CheckCircle2,
  MapPin, Package, Shield, Truck, Info, CreditCard,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { useCurrencyStore } from "@/lib/store/currency.store";
import toast from "react-hot-toast";

const LOGISTICS_OPTIONS = {
  COURIER: [
    { id: "dhl_express",    label: "DHL Express",           desc: "3-5 business days · International & domestic",  price: "Calculated at delivery" },
    { id: "fedex",          label: "FedEx",                 desc: "3-7 business days · International",             price: "Calculated at delivery" },
    { id: "ups",            label: "UPS",                   desc: "3-7 business days · International",             price: "Calculated at delivery" },
    { id: "afritide",       label: "Afritide Logistics",    desc: "5-10 business days · Pan-Africa",               price: "Negotiated" },
  ],
  ROAD_FREIGHT: [
    { id: "gig_logistics",  label: "GIG Logistics",         desc: "3-7 business days · Nigeria & West Africa",     price: "Negotiated with seller" },
    { id: "abc_transport",  label: "ABC Transport",         desc: "3-7 business days · Nigeria",                   price: "Negotiated with seller" },
    { id: "afritide",       label: "Afritide Logistics",    desc: "5-10 business days · Pan-Africa",               price: "Negotiated" },
    { id: "local_haulier",  label: "Local Haulier",         desc: "Arrange directly with seller",                  price: "Negotiated with seller" },
  ],
  HEAVY_TRUCK: [
    { id: "kobo360",        label: "Kobo360",               desc: "Pan-Africa trucking network",                   price: "Quote on request" },
    { id: "lori_systems",   label: "Lori Systems",          desc: "Pan-Africa freight platform",                   price: "Quote on request" },
    { id: "afritide",       label: "Afritide Logistics",    desc: "Coordinated freight solution",                  price: "Quote on request" },
    { id: "local_trucking", label: "Local Trucking",        desc: "Arrange directly with seller",                  price: "Negotiated with seller" },
  ],
  OCEAN_FREIGHT: [
    { id: "maersk",         label: "Maersk",                desc: "Global ocean freight · 15-45 days",             price: "Quote on request" },
    { id: "msc",            label: "MSC",                   desc: "Global ocean freight · 15-45 days",             price: "Quote on request" },
    { id: "cma_cgm",        label: "CMA CGM",               desc: "Global ocean freight · 15-45 days",             price: "Quote on request" },
    { id: "dhl_forwarding", label: "DHL Global Forwarding", desc: "Full container & LCL options",                  price: "Quote on request" },
    { id: "afritide",       label: "Afritide Logistics",    desc: "We coordinate your shipment",                   price: "Quote on request" },
  ],
  AIR_FREIGHT: [
    { id: "dhl_forwarding",  label: "DHL Global Forwarding",desc: "Express air cargo · 2-5 days",                 price: "Quote on request" },
    { id: "emirates_cargo",  label: "Emirates SkyCargo",    desc: "Premium air freight · 2-4 days",               price: "Quote on request" },
    { id: "qatar_cargo",     label: "Qatar Cargo",          desc: "Air freight · 2-5 days",                       price: "Quote on request" },
    { id: "afritide",        label: "Afritide Logistics",   desc: "We arrange your air shipment",                  price: "Quote on request" },
  ],
  PICKUP: [
    { id: "pickup",          label: "Farm / Warehouse Pickup", desc: "Collect directly from seller's location",   price: "Free" },
  ],
};

const SHIPMENT_TYPES = [
  { id: "COURIER",       label: "Courier",       desc: "Under 70 kg",            emoji: "📦", weight: "< 70 kg",   color: "text-sky-400",    bg: "bg-sky-950/30 border-sky-800/40" },
  { id: "ROAD_FREIGHT",  label: "Road Freight",  desc: "70 kg – 2 tonnes",       emoji: "🚐", weight: "70 kg – 2T",color: "text-green-400",  bg: "bg-green-950/30 border-green-800/40" },
  { id: "HEAVY_TRUCK",   label: "Heavy Truck",   desc: "2 – 20 tonnes",          emoji: "🚛", weight: "2T – 20T",  color: "text-amber-400",  bg: "bg-amber-950/30 border-amber-800/40" },
  { id: "OCEAN_FREIGHT", label: "Ocean Freight", desc: "20+ tonnes / Containers",emoji: "🚢", weight: "20T+",      color: "text-violet-400", bg: "bg-violet-950/30 border-violet-800/40" },
  { id: "AIR_FREIGHT",   label: "Air Freight",   desc: "Urgent international",   emoji: "✈️", weight: "Any weight",color: "text-rose-400",   bg: "bg-rose-950/30 border-rose-800/40" },
  { id: "PICKUP",        label: "Pickup",        desc: "Collect from seller",    emoji: "🏭", weight: "Any",       color: "text-gray-400",   bg: "bg-white/[0.03] border-white/[0.08]" },
];

function getRecommendedShipmentType(totalWeightKg: number): string {
  if (totalWeightKg < 70)    return "COURIER";
  if (totalWeightKg < 2000)  return "ROAD_FREIGHT";
  if (totalWeightKg < 20000) return "HEAVY_TRUCK";
  return "OCEAN_FREIGHT";
}

const STRIPE_CURRENCIES = ["USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

function CheckoutPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { items, setItems, clearCart }          = useCartStore();
  const { format, currency: selectedCurrency }  = useCurrencyStore();
  const router                                  = useRouter();
  const searchParams                            = useSearchParams();
  const [loading,         setLoading]           = useState(true);
  const [processing,      setProcessing]        = useState(false);
  const [orderDone,       setOrderDone]         = useState(false);
  const [orderId,         setOrderId]           = useState<string | null>(null);
  const [shipmentType,    setShipmentType]      = useState("COURIER");
  const [logisticsPartner,setLogisticsPartner]  = useState("dhl_express");
  const [shippingQuote,   setShippingQuote]     = useState<any>(null);
  const [loadingShipping, setLoadingShipping]   = useState(false);
  const [form, setForm] = useState({
    shipping_address: "",
    shipping_city:    "",
    shipping_country: "Nigeria",
    buyer_notes:      "",
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    loadCart();
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && items.length > 0) {
      handleStripeSuccess(sessionId);
    }
  }, [searchParams, items]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Fetch shipping quote when city or country changes
  useEffect(() => {
    fetchShippingQuote();
  }, [form.shipping_city, form.shipping_country, shipmentType, items.length]);

  const loadCart = async () => {
    try {
      const res       = await cartApi.get();
      const cartItems = res.data?.items || [];
      setItems(cartItems);

      const totalWeight = cartItems.reduce((sum: number, item: any) => {
        const w = item.unit === "TONNE" ? item.quantity * 1000
                : item.unit === "GRAM"  ? item.quantity / 1000
                : item.quantity;
        return sum + w;
      }, 0);

      const recommended = getRecommendedShipmentType(totalWeight);
      setShipmentType(recommended);
      const firstOption = LOGISTICS_OPTIONS[recommended as keyof typeof LOGISTICS_OPTIONS]?.[0];
      if (firstOption) setLogisticsPartner(firstOption.id);
    } catch {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingQuote = async () => {
    if (!form.shipping_city || !form.shipping_country || items.length === 0) return;
    if (shipmentType === "PICKUP") { setShippingQuote(null); return; }

    setLoadingShipping(true);
    try {
      const res = await apiClient.post("/logistics/quote", {
        items: items.map((item: any) => ({
          product_id:      item.product_id,
          quantity:        item.quantity,
          unit:            item.unit,
          category:        item.category || "CASH_CROPS",
          weight_per_unit: item.weight_per_unit || null,
        })),
        origin_state: (items[0] as any)?.seller_state || "Lagos",
        dest_state:   form.shipping_city,
        dest_country: form.shipping_country,
      });
      if (res.data?.success) setShippingQuote(res.data.data);
    } catch {
      setShippingQuote(null);
    } finally {
      setLoadingShipping(false);
    }
  };

  const subtotal     = items.reduce((sum, item) => sum + item.item_total, 0);
  const shippingCost = shipmentType === "PICKUP" ? 0 : (shippingQuote?.rate_ngn || 0);
  const total        = subtotal + shippingCost;
  const currency     = items[0]?.currency || "NGN";
  const useStripe    = STRIPE_CURRENCIES.includes(selectedCurrency.toUpperCase());

  const totalWeightKg = items.reduce((sum: number, item: any) => {
    const w = item.unit === "TONNE" ? item.quantity * 1000
            : item.unit === "GRAM"  ? item.quantity / 1000
            : item.quantity;
    return sum + w;
  }, 0);

  const selectedType    = SHIPMENT_TYPES.find(t => t.id === shipmentType);
  const currentPartners = LOGISTICS_OPTIONS[shipmentType as keyof typeof LOGISTICS_OPTIONS] || [];
  const selectedPartner = currentPartners.find(p => p.id === logisticsPartner);

  const handleShipmentTypeChange = (type: string) => {
    setShipmentType(type);
    const first = LOGISTICS_OPTIONS[type as keyof typeof LOGISTICS_OPTIONS]?.[0];
    if (first) setLogisticsPartner(first.id);
  };

  const getShippingPayload = () => ({
    cart_items:         items,
    shipping_address: {
      address: form.shipping_address,
      city:    form.shipping_city,
      country: form.shipping_country,
    },
    shipping_method:    selectedPartner?.label || shipmentType,
    shipment_type:      shipmentType,
    logistics_provider: logisticsPartner,
    shipping_cost:      shippingCost,
    buyer_notes:        form.buyer_notes || undefined,
  });

  const handleStripeCheckout = async () => {
    if (!form.shipping_address || !form.shipping_city) {
      toast.error("Please enter your shipping address");
      return;
    }
    setProcessing(true);
    try {
      const { convert } = useCurrencyStore.getState();

      const res = await apiClient.post("/payments/stripe/create-session", {
        ...getShippingPayload(),
        currency:    selectedCurrency,
        success_url: `${window.location.origin}/checkout`,
        cancel_url:  `${window.location.origin}/checkout`,
        cart_items: items.map((item: any) => ({
          ...item,
          price:      convert(item.price, item.currency),
          item_total: convert(item.item_total + (shippingCost / items.length), item.currency),
          currency:   selectedCurrency,
        })),
      });

      if (res.data?.success) {
        sessionStorage.setItem("checkout_payload", JSON.stringify(getShippingPayload()));
        window.location.href = res.data.data.checkout_url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create payment session");
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeSuccess = async (sessionId: string) => {
    setProcessing(true);
    try {
      const savedPayload = sessionStorage.getItem("checkout_payload");
      const checkoutData = savedPayload ? JSON.parse(savedPayload) : getShippingPayload();

      const res = await apiClient.post("/payments/stripe/verify", {
        session_id:       sessionId,
        ...checkoutData,
        payment_currency: selectedCurrency,
      });

      if (res.data?.success) {
        setOrderId(res.data?.data?.order_id);
        setOrderDone(true);
        clearCart();
        await cartApi.clear();
        sessionStorage.removeItem("checkout_payload");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to process order");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaystackSuccess = async (response: any) => {
    setProcessing(true);
    try {
      const res = await apiClient.post("/payments/paystack/verify", {
        reference: response.reference,
        ...getShippingPayload(),
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

  const handlePaystackCheckout = () => {
    if (!form.shipping_address || !form.shipping_city) {
      toast.error("Please enter your shipping address");
      return;
    }
    const reference = `AFR-${Date.now()}`;
    const handler   = (window as any).PaystackPop.setup({
      key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email:    user?.email,
      amount:   Math.round(total * 100),
      currency: "NGN",
      reference,
      metadata: {
        custom_fields: [
          { display_name: "Buyer Name",        variable_name: "buyer_name",        value: `${user?.first_name} ${user?.last_name}` },
          { display_name: "Shipment Type",     variable_name: "shipment_type",     value: shipmentType },
          { display_name: "Logistics Partner", variable_name: "logistics_partner", value: logisticsPartner },
          { display_name: "Platform",          variable_name: "platform",          value: "Afritide" },
        ],
      },
      callback: (response: any) => handlePaystackSuccess(response),
      onClose:  () => toast("Payment cancelled"),
    });
    handler.openIframe();
  };

  const handleCheckout = () => {
    if (useStripe) handleStripeCheckout();
    else           handlePaystackCheckout();
  };

  if (!hasHydrated) return null;

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
              📦 Logistics: {selectedPartner?.label || shipmentType}<br />
              🗂 Track your order in your dashboard
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

            <div className="lg:col-span-2 space-y-6">

              {/* Shipping Address */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" /> Shipping Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Street Address *</label>
                    <input value={form.shipping_address}
                      onChange={e => setForm({ ...form, shipping_address: e.target.value })}
                      placeholder="e.g. 12 Lagos Road, Ikeja"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">City / State *</label>
                      <input value={form.shipping_city}
                        onChange={e => setForm({ ...form, shipping_city: e.target.value })}
                        placeholder="e.g. Lagos"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                      <input value={form.shipping_country}
                        onChange={e => setForm({ ...form, shipping_country: e.target.value })}
                        placeholder="e.g. Nigeria"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment Type */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-green-500" /> Shipment Type
                </h2>

                <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-3 flex items-start gap-2 mb-5">
                  <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-300 text-xs leading-relaxed">
                    Based on your order weight (~{totalWeightKg.toFixed(1)} kg), we recommend{" "}
                    <strong>{selectedType?.label}</strong>. You can change this below.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {SHIPMENT_TYPES.map(type => (
                    <button key={type.id} type="button"
                      onClick={() => handleShipmentTypeChange(type.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${
                        shipmentType === type.id
                          ? `${type.bg} ${type.color} border-opacity-100`
                          : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:border-white/[0.12] hover:text-white"
                      }`}>
                      <span className="text-2xl">{type.emoji}</span>
                      <div>
                        <p className="font-bold text-xs">{type.label}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{type.weight}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <h3 className="text-gray-400 text-sm font-medium mb-3">Select Logistics Partner</h3>
                <div className="space-y-2">
                  {currentPartners.map(partner => (
                    <label key={partner.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        logisticsPartner === partner.id
                          ? "border-green-600/60 bg-green-950/30"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
                      }`}>
                      <input type="radio" name="logistics" value={partner.id}
                        checked={logisticsPartner === partner.id}
                        onChange={() => setLogisticsPartner(partner.id)}
                        className="accent-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{partner.label}</p>
                        <p className="text-gray-500 text-xs">{partner.desc}</p>
                      </div>
                      <span className="text-green-400 text-xs font-bold flex-shrink-0">{partner.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">Order Notes (optional)</h2>
                <textarea value={form.buyer_notes}
                  onChange={e => setForm({ ...form, buyer_notes: e.target.value })}
                  rows={3}
                  placeholder="Special instructions, delivery preferences..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 sticky top-24 space-y-5">
                <h2 className="text-white font-bold text-lg">Order Summary</h2>

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
                        {format(item.item_total, item.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.07] pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-white">{format(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Logistics</span>
                    <span className="text-gray-300 text-xs">{selectedPartner?.label || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping cost</span>
                    {loadingShipping ? (
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                      </span>
                    ) : shipmentType === "PICKUP" ? (
                      <span className="text-green-400 text-xs font-bold">Free</span>
                    ) : shippingQuote ? (
                      <div className="text-right">
                        <span className="text-green-400 text-xs font-bold">
                          {format(shippingQuote.rate_ngn || shippingQuote.min_cost, "NGN")}
                        </span>
                        {shippingQuote.is_estimate && (
                          <p className="text-gray-600 text-[10px]">
                            {shippingQuote.min_cost && shippingQuote.max_cost
                              ? `Est. ${format(shippingQuote.min_cost, "NGN")} – ${format(shippingQuote.max_cost, "NGN")}`
                              : "Estimate"
                            }
                          </p>
                        )}
                        {shippingQuote.transit_days && (
                          <p className="text-gray-600 text-[10px]">{shippingQuote.transit_days}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-400 text-xs">Enter city & country</span>
                    )}
                  </div>

                  {/* Shipping info banner for international */}
                  {shippingQuote?.is_estimate && (
                    <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
                      <p className="text-amber-300 text-[10px] leading-relaxed">
                        🌍 {shippingQuote.message}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-white/[0.07] pt-3 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <div className="text-right">
                      <span className="text-green-400 font-black text-xl">{format(total, currency)}</span>
                      {shippingQuote?.is_estimate && (
                        <p className="text-gray-600 text-[10px]">Inc. shipping estimate</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedType && (
                  <div className={`rounded-xl p-3 border ${selectedType.bg}`}>
                    <p className={`text-xs font-bold mb-0.5 ${selectedType.color}`}>
                      {selectedType.emoji} {selectedType.label}
                    </p>
                    <p className="text-gray-500 text-[10px]">{selectedPartner?.desc}</p>
                  </div>
                )}

                {/* Payment method indicator */}
                <div className={`rounded-xl p-3 border flex items-center gap-2 ${
                  useStripe
                    ? "bg-violet-950/20 border-violet-800/30"
                    : "bg-green-950/20 border-green-900/30"
                }`}>
                  <CreditCard className={`w-4 h-4 flex-shrink-0 ${useStripe ? "text-violet-400" : "text-green-500"}`} />
                  <p className="text-gray-400 text-xs">
                    {useStripe
                      ? "International payment via Stripe · Secure checkout"
                      : "Nigerian payment via Paystack · Your payment is protected"
                    }
                  </p>
                </div>

                <button onClick={handleCheckout} disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <>
                        <Shield className="w-4 h-4" />
                        {useStripe ? `Pay ${format(total, currency)} via Stripe` : `Pay ${format(total, currency)}`}
                      </>
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

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={null}>
      <CheckoutPage />
    </Suspense>
  );
}
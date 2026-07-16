"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { productsApi } from "@/lib/api/products.api";
import { ProductCategory } from "@/types";
import {
  ArrowLeft, ArrowRight, Loader2, Package, Upload, X, Truck, Shield,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";

const schema = z.object({
  title:                  z.string().min(3, "Title must be at least 3 characters"),
  description:            z.string().optional(),
  short_description:      z.string().optional(),
  category:               z.enum(["LIVESTOCK","DAIRY","CASH_CROPS","FRUITS","VEGETABLES","FISHERY","POULTRY","MACHINERY","SEEDS","FERTILIZERS"]),
  price:                  z.number().positive("Price must be greater than 0"),
  currency:               z.string().min(1).default("NGN"),
  is_negotiable:          z.boolean().default(false),
  minimum_order_quantity: z.number().positive().default(1),
  unit:                   z.enum(["KG","TONNE","GRAM","LITRE","PIECE","BAG","CRATE","DOZEN","BUNCH","HEAD","UNIT"]),
  quantity_available:     z.number().positive("Enter available quantity"),
  is_organic:             z.boolean().default(false),
  is_export_ready:        z.boolean().default(false),
  country:                z.string().optional(),
  state:                  z.string().optional(),
  city:                   z.string().optional(),
  delivery_time_days:     z.number().optional(),
  tags:                   z.string().optional(),
});

type FormData = z.input<typeof schema>;

const CATEGORIES = [
  { value: "LIVESTOCK",   label: "Livestock",   emoji: "🐄" },
  { value: "CASH_CROPS",  label: "Cash Crops",  emoji: "🌿" },
  { value: "DAIRY",       label: "Dairy",       emoji: "🥛" },
  { value: "FRUITS",      label: "Fruits",      emoji: "🥭" },
  { value: "VEGETABLES",  label: "Vegetables",  emoji: "🥬" },
  { value: "FISHERY",     label: "Fishery",     emoji: "🐟" },
  { value: "POULTRY",     label: "Poultry",     emoji: "🐔" },
  { value: "MACHINERY",   label: "Machinery",   emoji: "🚜" },
  { value: "SEEDS",       label: "Seeds",       emoji: "🌱" },
  { value: "FERTILIZERS", label: "Fertilizers", emoji: "🧪" },
];

const UNITS      = ["KG","TONNE","GRAM","LITRE","PIECE","BAG","CRATE","DOZEN","BUNCH","HEAD","UNIT"];
const CURRENCIES = ["NGN","USD","GBP","EUR","GHS","CFA"];

const DELIVERY_OPTIONS = [
  { value: "standard", label: "Standard Delivery", desc: "7-14 business days" },
  { value: "express",  label: "Express Delivery",  desc: "3-5 business days" },
  { value: "pickup",   label: "Farm Pickup",        desc: "Buyer picks up from farm" },
  { value: "freight",  label: "Freight/Logistics",  desc: "For bulk orders" },
];

const CERTIFICATION_OPTIONS = [
  "NAFDAC", "USDA Organic", "EU Organic", "SGS Certified",
  "Halal", "ISO 22000", "GlobalGAP", "Fairtrade",
];

export default function NewProductPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router  = useRouter();
  const [loading,          setLoading]          = useState(false);
  const [step,             setStep]             = useState(1);
  const [images,           setImages]           = useState<string[]>([]);
  const [uploadingImage,   setUploadingImage]   = useState(false);
  const [deliveryOptions,  setDeliveryOptions]  = useState<string[]>(["standard"]);
  const [priceTiers,       setPriceTiers]       = useState<{min_qty: number, max_qty: number | null, price: number}[]>([]);
  const [certifications,   setCertifications]   = useState<string[]>([]);
  const [labReportUrl,     setLabReportUrl]     = useState("");
  const [inspCertUrl,      setInspCertUrl]      = useState("");
  const [uploadingDoc,     setUploadingDoc]     = useState<"lab" | "insp" | null>(null);
  const [qualitySpecs,     setQualitySpecs]     = useState({
    moisture_percentage:       "",
    purity_percentage:         "",
    foreign_matter_percentage: "",
    protein_percentage:        "",
    oil_content_percentage:    "",
    broken_grain_percentage:   "",
  });

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency:               "NGN",
      unit:                   "KG",
      minimum_order_quantity: 1,
      is_organic:             false,
      is_export_ready:        false,
      is_negotiable:          false,
    },
  });

  const selectedCategory = watch("category");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) { toast.error("Maximum 5 images allowed"); return; }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/products/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.url;
      if (url) {
        setImages(prev => [...prev, url]);
        toast.success("Image uploaded");
      } else {
        toast.error("Upload succeeded but no URL returned");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "lab" | "insp") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploadingDoc(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/certificates/upload-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        const url = res.data.data.document_url;
        if (type === "lab") setLabReportUrl(url);
        else setInspCertUrl(url);
        toast.success("Document uploaded");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingDoc(null);
    }
  };

  const toggleDelivery      = (value: string) => setDeliveryOptions(prev =>
    prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]);

  const toggleCertification = (value: string) => setCertifications(prev =>
    prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]);

  const addTier    = () => setPriceTiers(prev => [...prev, { min_qty: 1, max_qty: null, price: 0 }]);
  const removeTier = (i: number) => setPriceTiers(prev => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: string, value: any) =>
    setPriceTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        tags:             data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        images,
        main_image:       images[0] || undefined,
        delivery_options: deliveryOptions,
        price_tiers:      priceTiers.length > 0 ? priceTiers : undefined,
        certifications:   certifications.length > 0 ? certifications : undefined,
        lab_report_url:             labReportUrl || undefined,
        inspection_certificate_url: inspCertUrl  || undefined,
        moisture_percentage:        qualitySpecs.moisture_percentage       ? Number(qualitySpecs.moisture_percentage)       : undefined,
        purity_percentage:          qualitySpecs.purity_percentage         ? Number(qualitySpecs.purity_percentage)         : undefined,
        foreign_matter_percentage:  qualitySpecs.foreign_matter_percentage ? Number(qualitySpecs.foreign_matter_percentage) : undefined,
        protein_percentage:         qualitySpecs.protein_percentage        ? Number(qualitySpecs.protein_percentage)        : undefined,
        oil_content_percentage:     qualitySpecs.oil_content_percentage    ? Number(qualitySpecs.oil_content_percentage)    : undefined,
        broken_grain_percentage:    qualitySpecs.broken_grain_percentage   ? Number(qualitySpecs.broken_grain_percentage)   : undefined,
      };
      const res = await productsApi.create(payload);
      if (res.success) {
        toast.success("Product submitted for review!");
        router.push("/dashboard/farmer/products");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated) return null;
  if (!isAuthenticated) return null;

  const STEPS = [
    { n: 1, label: "Basic Info" },
    { n: 2, label: "Pricing & Stock" },
    { n: 3, label: "Location" },
    { n: 4, label: "Quality" },
    { n: 5, label: "Images & Delivery" },
  ];

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-8">
          <Link href="/dashboard/farmer/products"
            className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to My Products
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">List New Product</h1>
          <p className="text-gray-500">Fill in the details below to list your product on Afritide.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {STEPS.map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => setStep(n)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                  step === n
                    ? "bg-green-600 text-white"
                    : step > n
                    ? "bg-green-900/60 text-green-400 border border-green-700/40"
                    : "bg-white/[0.04] text-gray-600 border border-white/[0.08]"
                }`}>
                {n}
              </button>
              <span className={`text-sm font-medium hidden sm:block ${step === n ? "text-white" : "text-gray-600"}`}>
                {label}
              </span>
              {n < 5 && <div className="w-8 h-px bg-white/[0.08] mx-1" />}
            </div>
          ))}
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 sm:p-8 space-y-6">

            {/* Step 1 — Basic Info */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Product Title <span className="text-red-400">*</span>
                  </label>
                  <input {...register("title")}
                    placeholder="e.g. Premium Grade A Cocoa Beans"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CATEGORIES.map((cat) => (
                      <button key={cat.value} type="button"
                        onClick={() => setValue("category", cat.value as ProductCategory)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-left ${
                          selectedCategory === cat.value
                            ? "border-green-600/70 bg-green-950/60 text-white"
                            : "border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/[0.14]"
                        }`}>
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Short Description</label>
                  <input {...register("short_description")}
                    placeholder="Brief summary (shows in listing cards)"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Description</label>
                  <textarea {...register("description")} rows={4}
                    placeholder="Detailed description — quality, sourcing, certifications..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tags <span className="text-gray-600">(comma-separated)</span>
                  </label>
                  <input {...register("tags")}
                    placeholder="e.g. organic, export-grade, sun-dried"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>
              </>
            )}

            {/* Step 2 — Pricing & Stock */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Price <span className="text-red-400">*</span>
                    </label>
                    <input {...register("price", { valueAsNumber: true })}
                      type="number" step="0.01" placeholder="0.00"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                    {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                    <select {...register("currency")}
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors appearance-none">
                      {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Unit of Measure <span className="text-red-400">*</span>
                    </label>
                    <select {...register("unit")}
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors appearance-none">
                      {UNITS.map(u => <option key={u} value={u} className="bg-[#0a1a0f]">{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Available Quantity <span className="text-red-400">*</span>
                    </label>
                    <input {...register("quantity_available", { valueAsNumber: true })}
                      type="number" placeholder="0"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                    {errors.quantity_available && <p className="text-red-400 text-xs mt-1">{errors.quantity_available.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Order Quantity</label>
                  <input {...register("minimum_order_quantity", { valueAsNumber: true })}
                    type="number" placeholder="1"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>

                {/* Bulk Pricing Tiers */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400">
                        Bulk Pricing Tiers <span className="text-gray-600">(optional)</span>
                      </label>
                      <p className="text-gray-700 text-xs mt-0.5">Set different prices for different order quantities</p>
                    </div>
                    <button type="button" onClick={addTier}
                      className="text-xs font-bold px-3 py-1.5 bg-green-950/40 hover:bg-green-900/50 text-green-400 border border-green-800/40 rounded-xl transition-all">
                      + Add Tier
                    </button>
                  </div>
                  {priceTiers.length === 0 ? (
                    <div className="border border-dashed border-white/[0.08] rounded-xl p-4 text-center">
                      <p className="text-gray-600 text-xs">No bulk tiers set — single price applies to all quantities</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {priceTiers.map((tier, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 items-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Min Qty</label>
                            <input type="number" value={tier.min_qty}
                              onChange={e => updateTier(i, "min_qty", Number(e.target.value))}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Max Qty</label>
                            <input type="number" value={tier.max_qty || ""}
                              onChange={e => updateTier(i, "max_qty", e.target.value ? Number(e.target.value) : null)}
                              placeholder="∞"
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none placeholder-gray-700" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 mb-1 block">Price per {watch("unit")}</label>
                            <input type="number" step="0.01" value={tier.price}
                              onChange={e => updateTier(i, "price", Number(e.target.value))}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                          </div>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => removeTier(i)}
                              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <p className="text-gray-700 text-[10px]">Leave Max Qty empty for the last tier to mean "and above"</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { key: "is_negotiable",   label: "Price is negotiable",   desc: "Buyers can submit offers" },
                    { key: "is_organic",      label: "Organically certified", desc: "Product has organic certification" },
                    { key: "is_export_ready", label: "Export ready",          desc: "Has export documentation" },
                  ].map(({ key, label, desc }) => (
                    <div key={key}
                      onClick={() => setValue(key as any, !watch(key as any))}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-green-700/30 transition-colors">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        watch(key as any) ? "bg-green-500 border-green-500" : "border-white/[0.15]"
                      }`}>
                        {watch(key as any) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-gray-600 text-xs">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 3 — Location */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                    <input {...register("country")} placeholder="e.g. Nigeria"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">State / Region</label>
                    <input {...register("state")} placeholder="e.g. Kano State"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                  <input {...register("city")} placeholder="e.g. Kano"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Delivery Time <span className="text-gray-600">(days)</span>
                  </label>
                  <input {...register("delivery_time_days", { valueAsNumber: true })}
                    type="number" placeholder="e.g. 7"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>

                <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-5">
                  <h3 className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Listing Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Title",    value: watch("title")    || "—" },
                      { label: "Category", value: watch("category") || "—" },
                      { label: "Price",    value: watch("price") ? `${watch("currency")} ${watch("price")} / ${watch("unit")}` : "—" },
                      { label: "Stock",    value: watch("quantity_available") ? `${watch("quantity_available")} ${watch("unit")}` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-white font-medium truncate max-w-[200px] capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 4 — Quality & Certifications */}
            {step === 4 && (
              <>
                <div>
                  <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-green-400" /> Quality Specifications
                  </h3>
                  <p className="text-gray-600 text-xs mb-4">All fields are optional — fill in what applies to your product</p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "moisture_percentage",       label: "Moisture %",       placeholder: "e.g. 12.5" },
                      { key: "purity_percentage",         label: "Purity %",         placeholder: "e.g. 98.0" },
                      { key: "foreign_matter_percentage", label: "Foreign Matter %",  placeholder: "e.g. 0.5" },
                      { key: "protein_percentage",        label: "Protein %",        placeholder: "e.g. 18.0" },
                      { key: "oil_content_percentage",    label: "Oil Content %",    placeholder: "e.g. 45.0" },
                      { key: "broken_grain_percentage",   label: "Broken Grain %",   placeholder: "e.g. 2.0" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                        <input
                          type="number" step="0.01" placeholder={placeholder}
                          value={qualitySpecs[key as keyof typeof qualitySpecs]}
                          onChange={e => setQualitySpecs(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Certifications</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CERTIFICATION_OPTIONS.map(cert => (
                      <div key={cert} onClick={() => toggleCertification(cert)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          certifications.includes(cert)
                            ? "border-green-600/60 bg-green-950/30 text-white"
                            : "border-white/[0.07] bg-white/[0.02] text-gray-400 hover:border-white/[0.12] hover:text-white"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          certifications.includes(cert) ? "bg-green-500 border-green-500" : "border-white/[0.2]"
                        }`}>
                          {certifications.includes(cert) && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-medium">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document uploads */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-400">Quality Documents</label>

                  {/* Lab Report */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">Laboratory Report</p>
                        <p className="text-gray-600 text-xs">PDF only · Max 10MB</p>
                      </div>
                      {labReportUrl
                        ? <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xs font-medium">✓ Uploaded</span>
                            <button type="button" onClick={() => setLabReportUrl("")}
                              className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                          </div>
                        : <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-xl transition-colors">
                            {uploadingDoc === "lab"
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Upload className="w-3.5 h-3.5" />
                            }
                            Upload
                            <input type="file" accept=".pdf" className="hidden"
                              onChange={e => handleDocUpload(e, "lab")} />
                          </label>
                      }
                    </div>
                  </div>

                  {/* Inspection Certificate */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">Inspection Certificate</p>
                        <p className="text-gray-600 text-xs">PDF only · Max 10MB</p>
                      </div>
                      {inspCertUrl
                        ? <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xs font-medium">✓ Uploaded</span>
                            <button type="button" onClick={() => setInspCertUrl("")}
                              className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                          </div>
                        : <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-xl transition-colors">
                            {uploadingDoc === "insp"
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Upload className="w-3.5 h-3.5" />
                            }
                            Upload
                            <input type="file" accept=".pdf" className="hidden"
                              onChange={e => handleDocUpload(e, "insp")} />
                          </label>
                      }
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 5 — Images & Delivery */}
            {step === 5 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Product Images <span className="text-gray-600">(up to 5)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08]">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button type="button"
                          onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors">
                          <X className="w-3 h-3 text-white" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                    {images.length < 5 && (
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          document.getElementById("img-upload-input")?.click();
                        }}
                        className="aspect-square rounded-xl border-2 border-dashed border-white/[0.12] hover:border-green-700/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                        {uploadingImage
                          ? <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                          : <>
                              <Upload className="w-6 h-6 text-gray-600 group-hover:text-green-500 transition-colors mb-1" />
                              <span className="text-gray-600 text-xs group-hover:text-green-400 transition-colors">Add Image</span>
                            </>
                        }
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs">First image will be the main product photo. Max 5MB each.</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-green-500" />
                    Delivery Options <span className="text-gray-600 ml-1">(select all that apply)</span>
                  </p>
                  <div className="space-y-2">
                    {DELIVERY_OPTIONS.map(opt => (
                      <div key={opt.value}
                        onClick={() => toggleDelivery(opt.value)}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                          deliveryOptions.includes(opt.value)
                            ? "border-green-600/60 bg-green-950/30"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
                        }`}>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                          deliveryOptions.includes(opt.value) ? "bg-green-500 border-green-500" : "border-white/[0.15]"
                        }`}>
                          {deliveryOptions.includes(opt.value) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{opt.label}</p>
                          <p className="text-gray-600 text-xs">{opt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button type="button"
              onClick={() => step > 1 ? setStep(step - 1) : router.push("/dashboard/farmer/products")}
              className="flex items-center gap-2 text-gray-400 hover:text-white font-medium px-5 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-sm">
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 5 ? (
              <button type="button" onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" disabled={loading}
                onClick={() => handleSubmit(onSubmit)()}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all text-sm shadow-xl shadow-green-900/30">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Package className="w-4 h-4" /> Submit for Review</>
                }
              </button>
            )}
          </div>
        </form>
      </div>

      <input
        id="img-upload-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        disabled={uploadingImage}
      />

      <Footer />
    </main>
  );
}
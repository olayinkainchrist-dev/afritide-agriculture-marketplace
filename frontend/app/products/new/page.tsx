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
  ArrowLeft, ArrowRight, Loader2, Package,
  Upload, X, Video, Truck,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";

const schema = z.object({
  title:                  z.string().min(3, "Title must be at least 3 characters"),
  description:            z.string().optional(),
  short_description:      z.string().optional(),
  category:               z.enum(["livestock","dairy","cash_crops","fruits","vegetables","fishery","poultry","machinery","seeds","fertilizers"]),
  price:                  z.number().positive("Price must be greater than 0"),
  currency:               z.string().min(1).default("USD"),
  is_negotiable:          z.boolean().default(false),
  minimum_order_quantity: z.number().positive().default(1),
  unit:                   z.enum(["kg","tonne","gram","litre","piece","bag","crate","dozen","bunch","head","unit"]),
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
  { value: "livestock",   label: "Livestock",   emoji: "🐄" },
  { value: "cash_crops",  label: "Cash Crops",  emoji: "🌿" },
  { value: "dairy",       label: "Dairy",       emoji: "🥛" },
  { value: "fruits",      label: "Fruits",      emoji: "🥭" },
  { value: "vegetables",  label: "Vegetables",  emoji: "🥬" },
  { value: "fishery",     label: "Fishery",     emoji: "🐟" },
  { value: "poultry",     label: "Poultry",     emoji: "🐔" },
  { value: "machinery",   label: "Machinery",   emoji: "🚜" },
  { value: "seeds",       label: "Seeds",       emoji: "🌱" },
  { value: "fertilizers", label: "Fertilizers", emoji: "🧪" },
];

const UNITS      = ["kg","tonne","gram","litre","piece","bag","crate","dozen","bunch","head","unit"];
const CURRENCIES = ["USD","NGN","GBP","EUR","GHS","CFA"];

const DELIVERY_OPTIONS = [
  { value: "standard", label: "Standard Delivery", desc: "7-14 business days" },
  { value: "express",  label: "Express Delivery",  desc: "3-5 business days" },
  { value: "pickup",   label: "Farm Pickup",        desc: "Buyer picks up from farm" },
  { value: "freight",  label: "Freight/Logistics",  desc: "For bulk orders" },
];

export default function NewProductPage() {
  const { isAuthenticated } = useAuthStore();
  const router  = useRouter();
  const [loading,         setLoading]         = useState(false);
  const [step,            setStep]            = useState(1);
  const [images,          setImages]          = useState<string[]>([]);
  const [videoUrl,        setVideoUrl]        = useState("");
  const [uploadingImage,  setUploadingImage]  = useState(false);
  const [uploadingVideo,  setUploadingVideo]  = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>(["standard"]);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency:               "NGN",
      unit:                   "kg",
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
      setImages(prev => [...prev, res.data?.data?.url]);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be under 50MB"); return; }
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/products/upload-video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVideoUrl(res.data?.data?.url);
      toast.success("Video uploaded");
    } catch {
      toast.error("Failed to upload video");
    } finally {
      setUploadingVideo(false);
    }
  };

  const toggleDelivery = (value: string) => {
    setDeliveryOptions(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        tags:             data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        images,
        main_image:       images[0] || undefined,
        video_url:        videoUrl || undefined,
        delivery_options: deliveryOptions,
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

  if (!isAuthenticated) return null;

  const STEPS = [
    { n: 1, label: "Basic Info" },
    { n: 2, label: "Pricing & Stock" },
    { n: 3, label: "Location" },
    { n: 4, label: "Media & Delivery" },
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
              {n < 4 && <div className="w-8 h-px bg-white/[0.08] mx-1" />}
            </div>
          ))}
        </div>

        {/* ── KEY FIX: form does NOT have onSubmit — all submission is manual ── */}
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
                      { label: "Title",    value: watch("title") || "—" },
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

            {/* Step 4 — Media & Delivery */}
            {step === 4 && (
              <>
                {/* Image upload */}
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
                        onClick={() => document.getElementById("image-upload")?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-white/[0.12] hover:border-green-700/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                        {uploadingImage
                          ? <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                          : <>
                              <Upload className="w-6 h-6 text-gray-600 group-hover:text-green-500 transition-colors mb-1" />
                              <span className="text-gray-600 text-xs group-hover:text-green-400 transition-colors">Add Image</span>
                            </>
                        }
                        <input id="image-upload" type="file" accept="image/*" className="hidden"
                          onChange={handleImageUpload} disabled={uploadingImage}
                          onClick={e => e.stopPropagation()} />
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs">First image will be the main product photo. Max 5MB each.</p>
                </div>

                {/* Video upload */}
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-green-500" />
                    Product Video <span className="text-gray-600 ml-1">(optional, max 50MB)</span>
                  </p>
                  {videoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black">
                      <video src={videoUrl} controls className="w-full max-h-48 object-contain" />
                      <button type="button" onClick={() => setVideoUrl("")}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById("video-upload")?.click()}
                      className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/[0.12] hover:border-green-700/50 rounded-xl cursor-pointer transition-colors group">
                      {uploadingVideo
                        ? <>
                            <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
                            <span className="text-gray-500 text-sm">Uploading video...</span>
                          </>
                        : <>
                            <Video className="w-8 h-8 text-gray-600 group-hover:text-green-500 transition-colors mb-2" />
                            <span className="text-gray-500 text-sm group-hover:text-green-400 transition-colors">Click to upload video</span>
                            <span className="text-gray-700 text-xs mt-1">MP4, MOV, AVI — max 50MB</span>
                          </>
                      }
                      <input id="video-upload" type="file" accept="video/*" className="hidden"
                        onChange={handleVideoUpload} disabled={uploadingVideo}
                        onClick={e => e.stopPropagation()} />
                    </div>
                  )}
                </div>

                {/* Delivery options */}
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

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button type="button"
              onClick={() => step > 1 ? setStep(step - 1) : router.push("/dashboard/farmer/products")}
              className="flex items-center gap-2 text-gray-400 hover:text-white font-medium px-5 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-sm">
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 4 ? (
              <button type="button" onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
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
      <Footer />
    </main>
  );
}
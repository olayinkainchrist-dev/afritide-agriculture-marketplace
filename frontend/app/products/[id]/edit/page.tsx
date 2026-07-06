"use client";
import { use, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { productsApi } from "@/lib/api/products.api";
import {
  ArrowLeft, Loader2, Save, Package,
  Leaf, Globe, ImagePlus, X, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const schema = z.object({
  title:                  z.string().min(3, "Title must be at least 3 characters"),
  description:            z.string().optional(),
  short_description:      z.string().optional(),
  price:                  z.number({ invalid_type_error: "Enter a valid price" }).positive(),
  currency:               z.string().default("USD"),
  is_negotiable:          z.boolean().default(false),
  minimum_order_quantity: z.number().positive().default(1),
  unit:                   z.enum(["kg","tonne","gram","litre","piece","bag","crate","dozen","bunch","head","unit"]),
  quantity_available:     z.number({ invalid_type_error: "Enter available quantity" }).positive(),
  is_organic:             z.boolean().default(false),
  is_export_ready:        z.boolean().default(false),
  country:                z.string().optional(),
  state:                  z.string().optional(),
  city:                   z.string().optional(),
  delivery_time_days:     z.number().optional(),
  tags:                   z.string().optional(),
  packaging:              z.string().optional(),
  storage_condition:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const UNITS = ["kg","tonne","gram","litre","piece","bag","crate","dozen","bunch","head","unit"];
const CURRENCIES = ["USD","NGN","GBP","EUR","GHS","CFA"];

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  // Fetch existing product
  const { data, isLoading } = useQuery({
    queryKey: ["product-edit", id],
    queryFn: () => productsApi.getById(id),
    enabled: isAuthenticated,
  });

  const product = data?.data;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Populate form when product loads
  useEffect(() => {
    if (product) {
      reset({
        title:                  product.title,
        description:            product.description || "",
        short_description:      product.short_description || "",
        price:                  product.price,
        currency:               product.currency,
        is_negotiable:          product.is_negotiable,
        minimum_order_quantity: product.minimum_order_quantity,
        unit:                   product.unit,
        quantity_available:     product.quantity_available,
        is_organic:             product.is_organic,
        is_export_ready:        product.is_export_ready,
        country:                product.country || "",
        state:                  product.state || "",
        city:                   product.city || "",
        delivery_time_days:     product.delivery_time_days || undefined,
        tags:                   product.tags?.join(", ") || "",
        packaging:              product.packaging || "",
        storage_condition:      product.storage_condition || "",
      });
    }
  }, [product, reset]);

  // Populate images when product loads
  useEffect(() => {
    if (product) {
      setProductImages(product.images || (product.main_image ? [product.main_image] : []));
    }
  }, [product]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        images: productImages,
        main_image: productImages[0] || null,
      };
      const res = await productsApi.update(id, payload);
      if (res.success) {
        toast.success("Product updated successfully!");
        router.push("/dashboard/farmer/products");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const res = await productsApi.uploadImages(id, files);
      if (res.success && res.data?.images) {
        setProductImages(res.data.images);
        toast.success(`${files.length} image(s) uploaded`);
      }
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = async (index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
    try {
      await productsApi.update(id, {
        images: newImages,
        main_image: newImages[0] || null,
      });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
      // Revert on failure
      setProductImages(productImages);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-white/[0.03] rounded-2xl animate-pulse" />
        ))}
      </div>
      <Footer />
    </main>
  );

  if (!isLoading && !product) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Package className="w-12 h-12 text-gray-700 mb-3" />
        <h2 className="text-white font-bold text-xl mb-2">Product not found</h2>
        <Link href="/dashboard/farmer/products"
          className="text-green-400 hover:text-green-300 text-sm mt-2 transition-colors">
          ← Back to My Products
        </Link>
      </div>
      <Footer />
    </main>
  );

  // Check ownership — only after product has loaded
  if (!isLoading && product && product.seller_id !== user?.id) {
    router.push("/dashboard/farmer/products");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/farmer/products"
            className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to My Products
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">Edit Product</h1>
              <p className="text-gray-500 text-sm truncate max-w-md">{product.title}</p>
            </div>
            <Link href={`/products/${id}`}
              className="flex-shrink-0 text-xs text-green-400 hover:text-green-300 bg-green-950/40 border border-green-800/40 px-3 py-2 rounded-xl transition-colors">
              View Live →
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Basic Info ──────────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" /> Basic Information
            </h2>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                Product Title <span className="text-red-400">*</span>
              </label>
              <input {...register("title")}
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Short Description</label>
              <input {...register("short_description")}
                placeholder="Brief summary shown in listing cards"
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Full Description</label>
              <textarea {...register("description")}
                rows={4}
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                Tags <span className="text-gray-600">(comma-separated)</span>
              </label>
              <input {...register("tags")}
                placeholder="e.g. organic, export-grade, sun-dried"
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
            </div>
          </div>

          {/* ── Pricing & Stock ──────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-500" /> Pricing & Stock
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Price <span className="text-red-400">*</span>
                </label>
                <input {...register("price", { valueAsNumber: true })}
                  type="number" step="0.01"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors" />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select {...register("currency")}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none appearance-none">
                  {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Unit</label>
                <select {...register("unit")}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none appearance-none">
                  {UNITS.map(u => <option key={u} value={u} className="bg-[#0a1a0f]">{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Available Quantity <span className="text-red-400">*</span>
                </label>
                <input {...register("quantity_available", { valueAsNumber: true })}
                  type="number"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors" />
                {errors.quantity_available && <p className="text-red-400 text-xs mt-1">{errors.quantity_available.message}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Min. Order Quantity</label>
                <input {...register("minimum_order_quantity", { valueAsNumber: true })}
                  type="number"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delivery Time (days)</label>
                <input {...register("delivery_time_days", { valueAsNumber: true })}
                  type="number"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors" />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              {[
                { key: "is_negotiable",   label: "Price is negotiable",   desc: "Buyers can submit offers" },
                { key: "is_organic",      label: "Organically certified", desc: "Has organic certification" },
                { key: "is_export_ready", label: "Export ready",          desc: "Has export documentation" },
              ].map(({ key, label, desc }) => (
                <label key={key}
                  className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-green-700/30 transition-colors">
                  <div
                    onClick={() => setValue(key as any, !watch(key as any), { shouldDirty: true })}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                      watch(key as any) ? "bg-green-500 border-green-500" : "border-white/[0.15]"
                    }`}
                  >
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
                </label>
              ))}
            </div>
          </div>

          {/* ── Location & Details ───────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-500" /> Location & Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "country",           label: "Country",           placeholder: "e.g. Nigeria" },
                { key: "state",             label: "State / Region",    placeholder: "e.g. Kano" },
                { key: "city",              label: "City",              placeholder: "e.g. Kano City" },
                { key: "packaging",         label: "Packaging",         placeholder: "e.g. 50kg jute bags" },
                { key: "storage_condition", label: "Storage Condition", placeholder: "e.g. Cool, dry place" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className={key === "storage_condition" || key === "packaging" ? "col-span-2 md:col-span-1" : ""}>
                  <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                  <input {...register(key as any)}
                    placeholder={placeholder}
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Images ───────────────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-green-500" /> Product Images
            </h2>

            {/* Existing images */}
            {productImages.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {productImages.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.07] group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">Main</span>
                    )}
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new */}
            <label className={`flex items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${
              uploadingImages
                ? "border-green-600/60 bg-green-950/20"
                : "border-white/[0.1] hover:border-green-700/40 hover:bg-white/[0.02]"
            }`}>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              {uploadingImages ? (
                <><Loader2 className="w-5 h-5 text-green-400 animate-spin" /><span className="text-green-400 text-sm font-medium">Uploading...</span></>
              ) : (
                <><ImagePlus className="w-5 h-5 text-gray-600" /><span className="text-gray-400 text-sm">Click to add more images</span></>
              )}
            </label>
          </div>

          {/* ── Save button ─────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4" /> Save Changes</>
              }
            </button>
            <Link
              href="/dashboard/farmer/products"
              className="px-6 py-4 text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-2xl text-sm font-medium transition-all"
            >
              Cancel
            </Link>
          </div>

          {isDirty && (
            <p className="text-amber-400 text-xs text-center flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              You have unsaved changes
            </p>
          )}
        </form>
      </div>
      <Footer />
    </main>
  );
}
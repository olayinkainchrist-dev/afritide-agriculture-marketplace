import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    livestock: "Livestock",
    dairy: "Dairy Products",
    cash_crops: "Cash Crops",
    fruits: "Fruits",
    vegetables: "Vegetables",
    fishery: "Fishery",
    poultry: "Poultry",
    machinery: "Machinery",
    seeds: "Seeds",
    fertilizers: "Fertilizers",
  };
  return labels[category] || category;
}

export function getTrendColor(trend: string): string {
  if (trend === "up") return "text-green-600";
  if (trend === "down") return "text-red-600";
  return "text-gray-500";
}

export function getTrendIcon(trend: string): string {
  if (trend === "up") return "▲";
  if (trend === "down") return "▼";
  return "—";
}

export function truncate(text: string, length = 100): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
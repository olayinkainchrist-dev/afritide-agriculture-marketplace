// ── USER TYPES ────────────────────────────────────────────────────────────────

export type UserRole =
  | "buyer" | "farmer" | "cooperative" | "exporter"
  | "processing_company" | "logistics_provider"
  | "warehouse_operator" | "government_agency" | "admin";

export type UserStatus = "pending" | "active" | "under_review" | "verified" | "suspended" | "banned";
export type VerificationBadge = "none" | "verified_farmer" | "verified_exporter" | "gold_supplier" | "premium_seller";

export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  profile_image?: string;
  role: UserRole;
  status: UserStatus;
  badge: VerificationBadge;
  country?: string;
  state?: string;
  city?: string;
  bio?: string;
  website?: string;
  farm_name?: string;
  years_of_experience?: number;
  rating_average: number;
  rating_count: number;
  total_sales: number;
  is_featured: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_submitted: boolean;
  kyc_approved: boolean;
  subscription_plan: string;
  currency: string;
  language: string;
  response_rate: number;
  last_login?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ── PRODUCT TYPES ─────────────────────────────────────────────────────────────

export type ProductCategory =
  | "livestock" | "dairy" | "cash_crops" | "fruits"
  | "vegetables" | "fishery" | "poultry" | "machinery"
  | "seeds" | "fertilizers";

export type ProductStatus = "draft" | "pending_review" | "active" | "out_of_stock" | "suspended" | "archived";
export type UnitOfMeasure = "kg" | "tonne" | "gram" | "litre" | "piece" | "bag" | "crate" | "dozen" | "bunch" | "head" | "unit";
export type ProductGrade = "grade_a" | "grade_b" | "grade_c" | "premium" | "standard" | "organic" | "export_quality";

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  category: ProductCategory;
  status: ProductStatus;
  price: number;
  min_price?: number;
  max_price?: number;
  currency: string;
  is_negotiable: boolean;
  minimum_order_quantity: number;
  unit: UnitOfMeasure;
  quantity_available: number;
  grade?: ProductGrade;
  is_organic: boolean;
  is_export_ready: boolean;
  certifications?: string[];
  main_image?: string;
  images?: string[];
  videos?: string[];
  country?: string;
  state?: string;
  city?: string;
  farm_location?: string;
  latitude?: number;
  longitude?: number;
  breed?: string;
  weight_kg?: number;
  age_months?: number;
  gender?: string;
  vaccination_status?: string;
  moisture_percentage?: number;
  harvest_date?: string;
  packaging?: string;
  storage_condition?: string;
  expiry_date?: string;
  shelf_life_days?: number;
  delivery_time_days?: number;
  view_count: number;
  order_count: number;
  rating_average: number;
  rating_count: number;
  wishlist_count: number;
  is_featured: boolean;
  tags?: string[];
  seller?: User;
  is_wishlisted?: boolean;
  created_at: string;
  published_at?: string;
}

// ── ORDER TYPES ───────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "shipped"
  | "delivered" | "completed" | "cancelled" | "disputed" | "refunded";

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  product_snapshot?: { title: string; image?: string };
}

export interface Order {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  tracking_number?: string;
  estimated_delivery?: string;
  buyer_notes?: string;
  seller_notes?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

// ── COMMODITY TYPES ───────────────────────────────────────────────────────────

export type PriceTrend = "up" | "down" | "stable";

export interface CommodityPrice {
  id: string;
  commodity_name: string;
  category?: string;
  price: number;
  previous_price?: number;
  currency: string;
  unit: string;
  trend: PriceTrend;
  change_percentage?: number;
  market?: string;
  country?: string;
  is_export_price: boolean;
  is_domestic_price: boolean;
  is_active: boolean;
  updated_at: string;
}

// ── RFQ TYPES ─────────────────────────────────────────────────────────────────

export type RFQStatus = "open" | "quoted" | "accepted" | "rejected" | "converted" | "expired" | "cancelled";

export interface RFQ {
  id: string;
  rfq_number: string;
  buyer_id: string;
  seller_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  target_price?: number;
  currency: string;
  status: RFQStatus;
  quoted_price?: number;
  quote_valid_until?: string;
  delivery_country?: string;
  delivery_date?: string;
  created_at: string;
}

// ── API TYPES ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id?: string;
  product_id?: string;
  overall_rating: number;
  quality_rating?: number;
  delivery_rating?: number;
  communication_rating?: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  seller_reply?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}
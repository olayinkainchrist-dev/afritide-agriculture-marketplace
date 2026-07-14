// ── USER TYPES ────────────────────────────────────────────────────────────────

export type UserRole =
  | "BUYER" | "FARMER" | "COOPERATIVE" | "EXPORTER"
  | "PROCESSING_COMPANY" | "LOGISTICS_PROVIDER"
  | "WAREHOUSE_OPERATOR" | "GOVERNMENT_AGENCY" | "ADMIN";

export type UserStatus = "PENDING" | "ACTIVE" | "UNDER_REVIEW" | "VERIFIED" | "SUSPENDED" | "BANNED";
export type VerificationBadge = "NONE" | "VERIFIED_FARMER" | "VERIFIED_EXPORTER" | "GOLD_SUPPLIER" | "PREMIUM_SELLER";

export interface User {
  id:                   string;
  email:                string;
  phone?:               string;
  first_name:           string;
  last_name:            string;
  business_name?:       string;
  profile_image?:       string;
  role:                 UserRole;
  status:               UserStatus;
  badge:                VerificationBadge;
  country?:             string;
  state?:               string;
  city?:                string;
  bio?:                 string;
  website?:             string;
  farm_name?:           string;
  years_of_experience?: number;
  rating_average:       number;
  rating_count:         number;
  total_sales:          number;
  total_orders?:        number;
  total_spent?:         number;
  followers_count?:     number;
  following_count?:     number;
  is_featured:          boolean;
  email_verified:       boolean;
  phone_verified:       boolean;
  kyc_submitted:        boolean;
  kyc_approved:         boolean;
  subscription_plan:    string;
  currency:             string;
  language:             string;
  response_rate:        number;
  last_login?:          string;
  created_at:           string;
}

export interface AuthResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  user:          User;
}

// ── PRODUCT TYPES ─────────────────────────────────────────────────────────────

export type ProductCategory =
  | "LIVESTOCK" | "DAIRY" | "CASH_CROPS" | "FRUITS"
  | "VEGETABLES" | "FISHERY" | "POULTRY" | "MACHINERY"
  | "SEEDS" | "FERTILIZERS";

export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "OUT_OF_STOCK" | "SUSPENDED" | "ARCHIVED";
export type UnitOfMeasure = "KG" | "TONNE" | "GRAM" | "LITRE" | "PIECE" | "BAG" | "CRATE" | "DOZEN" | "BUNCH" | "HEAD" | "UNIT";
export type ProductGrade  = "GRADE_A" | "GRADE_B" | "GRADE_C" | "PREMIUM" | "STANDARD" | "ORGANIC" | "EXPORT_QUALITY";

export interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price:   number;
}

export interface Product {
  id:                     string;
  seller_id:              string;
  title:                  string;
  slug:                   string;
  short_description?:     string;
  description?:           string;
  category:               ProductCategory;
  status:                 ProductStatus;
  price:                  number;
  min_price?:             number;
  max_price?:             number;
  currency:               string;
  is_negotiable:          boolean;
  minimum_order_quantity: number;
  unit:                   UnitOfMeasure;
  quantity_available:     number;
  grade?:                 ProductGrade;
  is_organic:             boolean;
  is_export_ready:        boolean;
  certifications?:        string[];
  main_image?:            string;
  images?:                string[];
  videos?:                string[];
  video_url?:             string;
  delivery_options?:      string[];
  price_tiers?:           PriceTier[];
  country?:               string;
  state?:                 string;
  city?:                  string;
  farm_location?:         string;
  latitude?:              number;
  longitude?:             number;
  breed?:                 string;
  weight_kg?:             number;
  age_months?:            number;
  gender?:                string;
  vaccination_status?:    string;
  moisture_percentage?:   number;
  harvest_date?:          string;
  packaging?:             string;
  storage_condition?:     string;
  expiry_date?:           string;
  shelf_life_days?:       number;
  delivery_time_days?:    number;
  view_count:             number;
  order_count:            number;
  rating_average:         number;
  rating_count:           number;
  wishlist_count:         number;
  is_featured:            boolean;
  tags?:                  string[];
  seller?:                User;
  is_wishlisted?:         boolean;
  created_at:             string;
  published_at?:          string;
  updated_at?:            string;
}

// ── ORDER TYPES ───────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED"
  | "DELIVERED" | "COMPLETED" | "CANCELLED" | "DISPUTED" | "REFUNDED";

export interface OrderItem {
  product_id:        string;
  quantity:          number;
  unit:              string;
  unit_price:        number;
  total_price:       number;
  product_snapshot?: { title: string; image?: string };
}

export interface Order {
  id:                  string;
  order_number:        string;
  buyer_id:            string;
  seller_id:           string;
  status:              OrderStatus;
  subtotal:            number;
  shipping_cost:       number;
  tax_amount:          number;
  total_amount:        number;
  currency:            string;
  tracking_number?:    string;
  estimated_delivery?: string;
  buyer_notes?:        string;
  seller_notes?:       string;
  items?:              OrderItem[];
  created_at:          string;
  updated_at:          string;
}

// ── RFQ TYPES ─────────────────────────────────────────────────────────────────

export type RFQStatus = "OPEN" | "QUOTED" | "ACCEPTED" | "REJECTED" | "CONVERTED" | "EXPIRED" | "CANCELLED";

export interface RFQ {
  id:                string;
  rfq_number:        string;
  buyer_id:          string;
  seller_id?:        string;
  product_name:      string;
  quantity:          number;
  unit:              string;
  target_price?:     number;
  currency:          string;
  status:            RFQStatus;
  quoted_price?:     number;
  quote_valid_until?:string;
  delivery_country?: string;
  delivery_date?:    string;
  created_at:        string;
}

// ── COMMODITY TYPES ───────────────────────────────────────────────────────────

export type PriceTrend = "UP" | "DOWN" | "STABLE";

export interface CommodityPrice {
  id:                string;
  commodity_name:    string;
  category?:         string;
  price:             number;
  previous_price?:   number;
  currency:          string;
  unit:              string;
  trend:             PriceTrend;
  change_percentage?:number;
  market?:           string;
  country?:          string;
  is_export_price:   boolean;
  is_domestic_price: boolean;
  is_active:         boolean;
  updated_at:        string;
}

// ── API TYPES ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data:    T;
}

export interface PaginatedResponse<T> {
  success:   boolean;
  message:   string;
  data:      T[];
  pagination: {
    total:       number;
    page:        number;
    page_size:   number;
    total_pages: number;
    has_next:    boolean;
    has_prev:    boolean;
  };
}

export interface Review {
  id:                   string;
  reviewer_id:          string;
  reviewee_id?:         string;
  product_id?:          string;
  overall_rating:       number;
  quality_rating?:      number;
  delivery_rating?:     number;
  communication_rating?:number;
  title?:               string;
  comment?:             string;
  is_verified_purchase: boolean;
  seller_reply?:        string;
  created_at:           string;
}

export interface Notification {
  id:          string;
  type:        string;
  title:       string;
  message:     string;
  is_read:     boolean;
  action_url?: string;
  created_at:  string;
}
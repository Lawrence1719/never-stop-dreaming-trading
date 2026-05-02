// Product variant: represents size, weight, format, quantity, etc.
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_label: string;        // e.g. "1kg", "5kg", "150g", "1L", "6-pack"
  price: number;
  stock: number;
  sku: string;
  item_code: string;            // Alphanumeric code (e.g. "47883")
  unit: string;                 // Unit of measure (e.g. "PC")
  doz_pckg: string;             // Packaging info (e.g. "48/ CASE PC")
  reorder_threshold?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
  created_at?: string;
}

// Product: base product information only (price/stock moved to variants)
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url?: string; // Legacy support
  images?: string[]; // Legacy support or for synthesized objects
  product_images?: ProductImage[]; // New related table
  category: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  specifications: Record<string, string>;
  doz_pckg?: string;
  unit?: string;
  
  // Nested variants (returned from API joins)
  variants?: ProductVariant[];
  
  // Computed fields for convenience
  totalStock?: number;           // sum of all variant stocks
  minPrice?: number;              // lowest variant price
  maxPrice?: number;              // highest variant price
  
  // Optional price/stock for cart and display purposes
  // (when not using variants, or for synthesized products)
  price?: number;
  stock?: number;
  sku?: string;
  compareAtPrice?: number;
  reorder_threshold?: number;
  
  // Optional IoT metadata for refrigerated / frozen items
  iot?: {
    status: 'online' | 'offline' | 'unknown' | 'error';
    lastUpdated?: string;
    deviceId?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export interface CartItem {
  productId: string;
  variantId: string;             // Reference to product_variants.id
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
  variantLabel?: string;         // e.g. "1kg", "5kg"
  sku?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  cityCode?: string;
  province: string;
  provinceCode?: string;
  barangay: string;
  barangayCode?: string;
  zip: string;
  default: boolean;
}

/** Single row from order_status_history for customer-facing timeline */
export interface OrderStatusHistoryEntry {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  notes: string | null;
  trackingNumber: string | null;
  courier: string | null;
}

export interface OrderItem {
  variantId: string;             // Reference to product_variants.id (primary identifier)
  productId?: string;            // Reference to product (optional, for context)
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku?: string;
  variantLabel?: string;         // e.g. "1kg", "5kg"
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "completed" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  discount_amount?: number;
  shipping: number;
  total: number;
  shippingAddress: Address;
  paymentMethod: string;
  shippingMethod?: string;
  trackingNumber?: string;
  deliveredAt?: string;
  confirmedByCustomerAt?: string;
  autoConfirmed?: boolean;
  hasRated?: boolean;
  rating?: number | null;
  reviewText?: string | null;
  ratedAt?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
  proofImageUrl?: string | null;
  deliveryNotes?: string | null;
  /** Newest first; omitted or empty when no history */
  statusHistory?: OrderStatusHistoryEntry[];
  isRejected?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'customer' | 'courier';
  notification_preferences?: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    marketingEmails: boolean;
    newsletter: boolean;
  };
  deleted_at?: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  memberSince: string;
  defaultAddressId?: string;
  addresses: Address[];
  role?: 'admin' | 'customer' | 'courier';
  notification_preferences?: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    marketingEmails: boolean;
    newsletter: boolean;
  };
  deleted_at?: string | null;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
  helpful: number;
}

export interface StockData {
  productId: string;
  quantity: number;
  status: "high" | "medium" | "low" | "out";
  lastUpdated: string;
  warehouse: string;
}

export interface TrackingUpdate {
  /** Stable id from order_status_history when present */
  id?: string;
  status: string;
  /** Lowercase DB status for styling (e.g. paid, shipped) */
  statusKey?: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface TrackingData {
  orderId: string;
  status: string;
  location: string;
  estimatedDelivery: string;
  updates: TrackingUpdate[];
  trackingNumber?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
  proofImageUrl?: string | null;
  deliveryNotes?: string | null;
  deliveredAt?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'stock' | 'system' | 'user';
  is_read: boolean;
  link?: string | null;
  target_role: 'customer' | 'admin';
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  placement: 'homepage_hero' | 'product_page' | 'sidebar' | 'header';
  image_url: string | null;
  link_url: string | null;
  status: 'active' | 'inactive' | 'scheduled';
  clicks: number;
  impressions: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

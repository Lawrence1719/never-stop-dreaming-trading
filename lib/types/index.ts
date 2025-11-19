export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  stock: number;
  sku: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  specifications: Record<string, string>;
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
  quantity: number;
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
  province: string;
  zip: string;
  default: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: Address;
  paymentMethod: string;
  trackingNumber?: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'customer';
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
  role?: 'admin' | 'customer';
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
  status: string;
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
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'stock' | 'system';
  read: boolean;
  link?: string | null;
  created_at: string;
}

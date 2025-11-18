import { Order, TrackingData } from "@/lib/types";

export const mockOrders: Order[] = [
  {
    id: "ord-1",
    orderNumber: "ORD-2025-001",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "delivered",
    items: [
      { productId: "1", name: "Premium Trading Analytics Toolkit", price: 299.99, quantity: 1, image: "/placeholder.svg?key=g9ekm" },
    ],
    subtotal: 299.99,
    shipping: 10,
    total: 309.99,
    shippingAddress: {
      id: "addr-1",
      label: "Home",
      fullName: "John Doe",
      phone: "+1 (555) 123-4567",
      street: "123 Main St",
      city: "New York",
      province: "NY",
      zip: "10001",
      default: true,
    },
    paymentMethod: "Credit Card (ending in 4242)",
    trackingNumber: "TRACK-123456789",
  },
];

export const mockTracking: TrackingData[] = [
  {
    orderId: "ord-1",
    status: "delivered",
    location: "New York, NY",
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    updates: [
      {
        status: "Delivered",
        location: "New York, NY",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Package delivered at your address",
      },
      {
        status: "Out for Delivery",
        location: "Local Facility, NY",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Package is out for delivery",
      },
      {
        status: "Shipped",
        location: "Distribution Center, PA",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Package has shipped",
      },
      {
        status: "Order Confirmed",
        location: "Warehouse, TX",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Order has been confirmed",
      },
    ],
  },
];

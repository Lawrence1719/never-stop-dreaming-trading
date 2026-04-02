/** Payload shapes consumed by `ExportReportModal` (must match API + modal usage). */

export interface SalesReportExportPayload {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  topProducts: Array<{
    name: string;
    sold: number;
    revenue: number;
    isDeletedProduct?: boolean;
  }>;
}

export interface InventoryReportExportPayload {
  summary: {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    inStockPercentage: number | string;
  };
  lowStockItems: Array<{
    name: string;
    sku: string;
    stock: number;
    threshold: number;
    status: string;
  }>;
}

export interface CustomersReportExportPayload {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    avgOrderValue: number;
    customerLifetimeValue: number;
  };
  topCustomers: Array<{
    name: string;
    email: string;
    orders: number;
    totalSpent: string | number;
    status: string;
  }>;
}

export type ExportReportModalPayload =
  | SalesReportExportPayload
  | InventoryReportExportPayload
  | CustomersReportExportPayload;

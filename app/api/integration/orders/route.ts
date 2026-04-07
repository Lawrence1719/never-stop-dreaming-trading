import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateToken } from '@/lib/integration/token-store';

/**
 * POST /api/integration/orders
 * 
 * Receives order data from BeatRoute / external ERP system.
 * Validates Bearer token, matches SKUs to products/variants,
 * and creates order + order_items in database.
 * 
 * Authentication: Bearer token (from /api/integration/user/refresh)
 * 
 * Request Body:
 * {
 *   "retailer_br_id": 15758594,
 *   "retailer_external_id": "CUST-001",
 *   "erp_invoice_number": "INV-001",
 *   "invoice_date": "2026-03-07",
 *   "status": 1,
 *   "order_status": "Pending",
 *   "total_tax": 10.00,
 *   "total_value": 510.00,
 *   "remarks": "Rush order",
 *   "payment_due_date": "2026-03-14",
 *   "invoice_level_discount": 0,
 *   "details": [
 *     {
 *       "sku_external_id": "SKU-001",
 *       "quantity": 10,
 *       "sku_uom": "PC",
 *       "price_per_item": 100.00,
 *       "discount_value": 0,
 *       "gross_value": 1000.00,
 *       "tax_code": "",
 *       "tax": 10
 *     }
 *   ]
 * }
 */

interface OrderDetail {
  sku_external_id: string;
  quantity: string | number;
  price_per_item: number;
  discount_value?: number;
  sku_uom?: string;
  gross_value?: number;
  tax_code?: string;
  tax?: number;
}

interface OrderRequest {
  retailer_br_id: number;
  retailer_external_id?: string;
  erp_invoice_number: string;
  invoice_date: string;
  status?: number;
  order_id?: number | null;
  external_order_id?: string | null;
  ship_to_external_id?: string;
  order_status?: string;
  total_tax?: number;
  total_value?: number;
  remarks?: string | null;
  payment_due_date?: string;
  invoice_level_discount?: number;
  customFields?: Array<{ id: string; value: string }>;
  details: OrderDetail[];
}

// Validate API key or token
async function validateAuth(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  // First, try to validate as a static API key (no DB round-trip).
  const expectedApiKey = process.env.INTEGRATION_API_KEY;
  if (expectedApiKey && token === expectedApiKey) {
    return true;
  }

  // Fall back to DB-backed token validation.
  return await validateToken(token);
}

// Validate request body
function validateOrderRequest(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.retailer_br_id || typeof req.retailer_br_id !== 'number') {
    return { valid: false, error: 'retailer_br_id is required and must be a number' };
  }

  if (!req.erp_invoice_number || typeof req.erp_invoice_number !== 'string') {
    return { valid: false, error: 'erp_invoice_number is required and must be a string' };
  }

  if (!req.invoice_date || typeof req.invoice_date !== 'string') {
    return { valid: false, error: 'invoice_date is required and must be a string' };
  }

  if (!Array.isArray(req.details) || req.details.length === 0) {
    return { valid: false, error: 'details must be a non-empty array' };
  }

  // Validate each detail
  for (const detail of req.details) {
    if (!detail || typeof detail !== 'object') {
      return { valid: false, error: 'Each detail must be an object' };
    }

    const d = detail as Record<string, unknown>;

    if (!d.sku_external_id || typeof d.sku_external_id !== 'string') {
      return { valid: false, error: 'Each detail must have sku_external_id (string)' };
    }

    if (d.quantity === undefined || d.quantity === null) {
      return { valid: false, error: 'Each detail must have quantity' };
    }

    if (typeof d.price_per_item !== 'number') {
      return { valid: false, error: 'Each detail must have price_per_item (number)' };
    }
  }

  return { valid: true };
}

// Match SKU to product_variants first, then products
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function matchSku(
  supabase: any,
  skuExternalId: string
): Promise<{ product_id: string | null; variant_id: string | null }> {
  try {
    // 1. Try to match against product_variants.sku
    const { data: variant } = await supabase
      .from('product_variants')
      .select('id, product_id')
      .eq('sku', skuExternalId)
      .limit(1)
      .single();

    if (variant) {
      const v = variant as unknown as { id: string; product_id: string };
      return { product_id: v.product_id, variant_id: v.id };
    }
  } catch {
    // No variant match, continue
  }

  try {
    // 2. Try to match against products.sku
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('sku', skuExternalId)
      .limit(1)
      .single();

    if (product) {
      const p = product as unknown as { id: string };
      return { product_id: p.id, variant_id: null };
    }
  } catch {
    // No product match, continue
  }

  // 3. No match found — still accept the order
  return { product_id: null, variant_id: null };
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key or token
    const authHeader = request.headers.get('authorization');
    if (!await validateAuth(authHeader)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key or token',
        },
        { status: 401 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateOrderRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const orderData = body as OrderRequest;

    // Initialize Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for duplicate order (by erp_invoice_number)
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id')
      .eq('external_reference', orderData.erp_invoice_number)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for duplicate order:', checkError);
      return NextResponse.json(
        {
          success: false,
          error: 'Server error',
          message: 'Failed to check for existing order',
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate order',
          message: `Order with invoice number ${orderData.erp_invoice_number} already exists`,
          order_id: existingOrder.id,
        },
        { status: 409 }
      );
    }

    // Match all SKUs to products/variants in parallel
    const skuMatches = await Promise.all(
      orderData.details.map((detail) => matchSku(supabase, detail.sku_external_id))
    );

    // Calculate order total from line items
    const calculatedTotal = orderData.details.reduce((sum, detail) => {
      const quantity = typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity;
      const discount = detail.discount_value || 0;
      return sum + (quantity * detail.price_per_item) - discount;
    }, 0);

    // Use BeatRoute's total_value if provided, otherwise use calculated total
    const orderTotal = orderData.total_value ?? calculatedTotal;

    // Prepare items JSONB for backward compatibility
    const itemsJsonb = orderData.details.map((detail, i) => ({
      sku_external_id: detail.sku_external_id,
      product_id: skuMatches[i].product_id,
      variant_id: skuMatches[i].variant_id,
      quantity: typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity,
      price_per_item: detail.price_per_item,
      discount_value: detail.discount_value || 0,
      sku_uom: detail.sku_uom || null,
      gross_value: detail.gross_value || null,
      tax: detail.tax || 0,
    }));

    // Create order in database
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: null, // Integration orders don't have a user_id
        status: 'pending',
        total: parseFloat(orderTotal.toFixed(2)),
        items: itemsJsonb,
        payment_method: 'warehouse_integration',
        source: 'beatroute',
        external_reference: orderData.erp_invoice_number,
        retailer_br_id: orderData.retailer_br_id,
        invoice_date: orderData.invoice_date,
        total_tax: orderData.total_tax ?? 0,
        remarks: orderData.remarks || null,
        payment_due_date: orderData.payment_due_date || null,
        invoice_level_discount: orderData.invoice_level_discount ?? 0,
        custom_fields: orderData.customFields || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating order:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Server error',
          message: 'Failed to create order',
        },
        { status: 500 }
      );
    }

    // Create order_items records with product linkage
    const orderItems = orderData.details.map((detail, i) => ({
      order_id: newOrder.id,
      product_id: skuMatches[i].product_id,
      variant_id: skuMatches[i].variant_id,
      sku_external_id: detail.sku_external_id,
      quantity: typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity,
      price: detail.price_per_item,
      discount_value: detail.discount_value || 0,
      sku_uom: detail.sku_uom || null,
      gross_value: detail.gross_value || null,
      tax_code: detail.tax_code || null,
      tax: detail.tax || 0,
      created_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.warn('Warning: Could not create order_items records:', itemsError);
      // Don't fail — the order itself was already created
    }

    // Count how many SKUs matched
    const matchedCount = skuMatches.filter((m) => m.product_id !== null).length;
    const unmatchedCount = skuMatches.length - matchedCount;

    return NextResponse.json(
      {
        success: true,
        order_id: newOrder.id,
        message: 'Order created successfully',
        reference: orderData.erp_invoice_number,
        total: parseFloat(orderTotal.toFixed(2)),
        item_count: orderData.details.length,
        sku_matched: matchedCount,
        sku_unmatched: unmatchedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in integration orders endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateToken } from '@/lib/integration/token-store';

/**
 * POST /api/integration/orders
 * 
 * Receives order data from external warehouse system
 * Validates API key OR token and creates order in database
 * 
 * Authentication: Supports both API key (Bearer token) and username/password token
 * 
 * Request Body:
 * {
 *   "retailer_br_id": 15758594,
 *   "erp_invoice_number": "INV-001",
 *   "invoice_date": "2024-12-17",
 *   "details": [
 *     {
 *       "sku_external_id": "SKU-001",
 *       "quantity": "10",
 *       "price_per_item": 100.00
 *     }
 *   ]
 * }
 * 
 * Response:
 * - 200: {"success": true, "order_id": "...", "message": "Order created"}
 * - 400: {"success": false, "error": "Invalid request data"}
 * - 401: {"success": false, "error": "Unauthorized"}
 * - 409: {"success": false, "error": "Duplicate order"}
 * - 500: {"success": false, "error": "Server error"}
 */

interface OrderDetail {
  sku_external_id: string;
  quantity: string | number;
  price_per_item: number;
  discount_value?: number;
}

interface OrderRequest {
  retailer_br_id: number;
  erp_invoice_number: string;
  invoice_date: string;
  details: OrderDetail[];
}

// Validate API key or token
function validateAuth(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  // First, try to validate as API key
  const expectedApiKey = process.env.INTEGRATION_API_KEY;
  if (expectedApiKey && token === expectedApiKey) {
    return true;
  }

  // If not API key, try to validate as username/password token
  if (validateToken(token)) {
    return true;
  }

  return false;
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

export async function POST(request: NextRequest) {
  try {
    // Validate API key or token
    const authHeader = request.headers.get('authorization');
    if (!validateAuth(authHeader)) {
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
      // PGRST116 means no rows found, which is expected
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

    // Calculate order total
    const total = orderData.details.reduce((sum, detail) => {
      const quantity = typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity;
      const discount = detail.discount_value || 0;
      return sum + (quantity * detail.price_per_item) - discount;
    }, 0);

    // Prepare items for JSONB storage
    const items = orderData.details.map((detail) => ({
      sku_external_id: detail.sku_external_id,
      quantity: typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity,
      price_per_item: detail.price_per_item,
      discount_value: detail.discount_value || 0,
    }));

    // Create order in database
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: null, // Integration orders don't have a user_id
        status: 'pending',
        total: parseFloat(total.toFixed(2)),
        items: items,
        payment_method: 'warehouse_integration',
        external_reference: orderData.erp_invoice_number,
        retailer_br_id: orderData.retailer_br_id,
        invoice_date: orderData.invoice_date,
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

    // Also create individual order_items records if the table exists
    try {
      const orderItems = orderData.details.map((detail) => ({
        order_id: newOrder.id,
        sku_external_id: detail.sku_external_id,
        quantity: typeof detail.quantity === 'string' ? parseInt(detail.quantity) : detail.quantity,
        price: detail.price_per_item,
        discount_value: detail.discount_value || 0,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.warn('Warning: Could not create order_items records:', itemsError);
        // Don't fail the whole request if order_items table doesn't exist
      }
    } catch (error) {
      console.warn('Warning: order_items table may not exist:', error);
      // Continue - order was already created successfully
    }

    return NextResponse.json(
      {
        success: true,
        order_id: newOrder.id,
        message: 'Order created successfully',
        reference: orderData.erp_invoice_number,
        total: parseFloat(total.toFixed(2)),
        item_count: orderData.details.length,
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

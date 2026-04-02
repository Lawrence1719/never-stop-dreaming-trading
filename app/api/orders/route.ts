import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatOrderNumber } from '@/lib/utils/formatting';

/**
 * GET /api/orders
 * Fetches orders for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session from the request
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch total counts per status for the badges
    const { data: countData, error: countError } = await supabaseClient
      .from('orders')
      .select('status')
      .eq('user_id', user.id);

    if (countError) throw countError;

    const statusCounts = (countData || []).reduce((acc: any, order: any) => {
      const s = order.status === 'completed' ? 'delivered' : order.status === 'paid' ? 'processing' : order.status;
      acc[s] = (acc[s] || 0) + 1;
      acc['all'] = (acc['all'] || 0) + 1;
      return acc;
    }, { all: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });

    // 2. Build the main query for orders
    let query = supabaseClient
      .from('orders')
      .select(`
        *,
        shipping_address:addresses!shipping_address_id(*),
        reviews(id, rating, comment, created_at),
        courier_profile:profiles!courier_id(name, phone),
        courier_deliveries(proof_image_url, delivery_notes, delivered_at),
        order_items(
          *,
          product_variants:variant_id(variant_label),
          products:product_id(name, image_url, deleted_at)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);

    // Apply status filter
    if (status && status !== 'all') {
      if (status === 'processing') {
        query = query.in('status', ['processing', 'paid']);
      } else if (status === 'delivered') {
        query = query.in('status', ['delivered', 'completed']);
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply search filter
    if (search) {
      query = query.ilike('id', `%${search}%`);
    }

    // Apply ordering and pagination
    const { data: ordersData, error: ordersError, count: totalCount } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('Failed to fetch orders', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Build a global sequence map: order id → sequential position (1-based, oldest first)
    // This is used to generate human-readable #00047 order numbers on the customer side.
    // The admin panel uses its own separate display format and is not affected.
    const { data: allOrderIds } = await supabaseClient
      .from('orders')
      .select('id')
      .order('created_at', { ascending: true });

    const sequenceMap = new Map<string, number>();
    (allOrderIds || []).forEach((row: { id: string }, idx: number) => {
      sequenceMap.set(row.id, idx + 1);
    });

    // Map database orders to frontend Order format
    const orders = (ordersData || []).map((row: any) => {
      // Parse items from JSONB and joined table
      const jsonItems = Array.isArray(row.items) ? row.items : [];
      const dbItems = Array.isArray(row.order_items) ? row.order_items : [];
      
      const orderItems = (dbItems.length > 0 ? dbItems : jsonItems).map((item: any) => {
        const variantLabel = item.product_variants?.variant_label || item.variant_label || item.variantLabel || null;
        
        // Use p.name, or fall back to item.name if it's not the generic "PRODUCT" placeholder
        const baseProductName = item.products?.name || item.name;
        let productName = baseProductName;
        if (!productName || productName.toUpperCase() === 'PRODUCT') {
          productName = 'Product no longer available';
        } else if (item.products?.deleted_at) {
          productName = `${productName} (Removed)`;
        }

        const productImage = item.products?.image_url || item.image || item.image_url || null;
        
        return {
          productId: item.product_id || item.productId || '',
          variantId: item.variant_id || item.variantId || null,
          variantLabel,
          name: productName,
          price: Number(item.price) || 0,
          quantity: item.quantity || 1,
          image: productImage,
        };
      });

      // Get shipping address details
      const addressRecord = row.shipping_address && typeof row.shipping_address === 'object' && !Array.isArray(row.shipping_address)
        ? row.shipping_address
        : null;
      
      const shippingAddressData = addressRecord || 
        (typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address) || 
        {};
      
      const subtotal = orderItems.reduce((sum: number, item: any) => {
        return sum + (Number(item.price) || 0) * (item.quantity || 1);
      }, 0);
      
      const shipping = Math.max(0, Number(row.total) - subtotal);
      const seq = sequenceMap.get(row.id) ?? 0;
      const orderNumber = formatOrderNumber(seq);
      const date = new Date(row.created_at).toISOString();
      
      const shippingAddress = {
        id: addressRecord?.id || '',
        label: 'Shipping Address',
        fullName: addressRecord?.full_name || shippingAddressData.full_name || shippingAddressData.fullName || '',
        phone: addressRecord?.phone || shippingAddressData.phone || '',
        street: addressRecord?.street_address || shippingAddressData.street_address || shippingAddressData.street || shippingAddressData.line1 || '',
        city: addressRecord?.city || shippingAddressData.city || '',
        province: addressRecord?.province || shippingAddressData.province || '',
        zip: addressRecord?.zip_code || shippingAddressData.zip_code || shippingAddressData.zip || shippingAddressData.postal || '',
        default: addressRecord?.is_default || false,
      };

      const shippingMethod = shippingAddressData.shipping_method || 'standard';
      const shippingMethodDisplay = shippingMethod === 'express' 
        ? 'Express Shipping (2-3 business days)'
        : 'Standard Shipping (5-7 business days)';

      return {
        id: row.id,
        orderNumber,
        date,
        status: row.status === 'completed' ? 'delivered' : row.status === 'paid' ? 'processing' : row.status,
        items: orderItems,
        subtotal,
        shipping,
        total: Number(row.total) || 0,
        shippingAddress,
        paymentMethod: row.payment_method || 'card',
        shippingMethod: shippingMethodDisplay,
        trackingNumber: row.tracking_number || null,
        deliveredAt: row.delivered_at || null,
        confirmedByCustomerAt: row.confirmed_by_customer_at || null,
        autoConfirmed: row.auto_confirmed || false,
        hasRated: row.reviews && row.reviews.length > 0,
        rating: row.reviews?.[0]?.rating || null,
        reviewText: row.reviews?.[0]?.comment || null,
        ratedAt: row.reviews?.[0]?.created_at || null,
        courierName: (row.courier_profile as any)?.name || null,
        courierPhone: (row.courier_profile as any)?.phone || null,
        proofImageUrl: (row.courier_deliveries?.[0] as any)?.proof_image_url || null,
        deliveryNotes: (row.courier_deliveries?.[0] as any)?.delivery_notes || null,
      };
    });

    return NextResponse.json({ 
      data: orders,
      pagination: {
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      statusCounts
    });
  } catch (error) {
    console.error('Failed to load orders', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch orders for this user
    const { data: ordersData, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map database orders to frontend Order format
    const orders = (ordersData || []).map((row: any) => {
      // Parse items from JSONB
      const items = Array.isArray(row.items) ? row.items : [];
      
      // Parse shipping address from JSONB
      const shippingAddressData = row.shipping_address || {};
      
      // Calculate subtotal from items
      const subtotal = items.reduce((sum: number, item: any) => {
        return sum + (Number(item.price) || 0) * (item.quantity || 1);
      }, 0);
      
      // Calculate shipping (total - subtotal, or 0 if not available)
      const shipping = Math.max(0, Number(row.total) - subtotal);
      
      // Generate order number from ID
      const orderNumber = `ORD-${row.id.slice(0, 8).toUpperCase()}`;
      
      // Format date
      const date = new Date(row.created_at).toISOString();
      
      // Map items to OrderItem format
      const orderItems = items.map((item: any) => ({
        productId: item.product_id || item.productId || '',
        name: item.name || 'Product',
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
        image: item.image || item.image_url || '/placeholder.svg',
      }));

      // Map shipping address to Address format
      const shippingAddress = {
        id: '',
        label: 'Shipping Address',
        fullName: shippingAddressData.full_name || shippingAddressData.fullName || '',
        phone: shippingAddressData.phone || '',
        street: shippingAddressData.street_address || shippingAddressData.street || shippingAddressData.line1 || '',
        city: shippingAddressData.city || '',
        province: shippingAddressData.province || '',
        zip: shippingAddressData.zip_code || shippingAddressData.zip || shippingAddressData.postal || '',
        default: false,
      };

      // Extract shipping method from shipping address data
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
      };
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error('Failed to load orders', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}


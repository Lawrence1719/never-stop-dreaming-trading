import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/addresses
 * Fetches all addresses for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch addresses for this user
    const { data: addresses, error } = await supabaseClient
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch addresses', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to frontend Address format
    const formattedAddresses = (addresses || []).map((addr) => ({
      id: addr.id,
      label: addr.address_type === 'billing' ? 'Billing Address' : 'Shipping Address',
      fullName: addr.full_name,
      phone: addr.phone,
      street: addr.street_address,
      city: addr.city,
      province: addr.province,
      zip: addr.zip_code,
      default: addr.is_default,
    }));

    return NextResponse.json({ addresses: formattedAddresses }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/addresses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addresses
 * Creates a new address for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { street, city, province, zip, isDefault = false, addressType = 'shipping' } = body;

    // Validate required fields
    if (!street || !city || !province || !zip) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user profile for name and phone
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();

    const fullName = profile?.name || user.email?.split('@')[0] || 'User';
    const phone = profile?.phone || '';

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabaseClient
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Create new address
    const { data: newAddress, error } = await supabaseClient
      .from('addresses')
      .insert({
        user_id: user.id,
        full_name: fullName,
        email: user.email,
        phone: phone,
        street_address: street,
        city: city,
        province: province,
        zip_code: zip,
        address_type: addressType,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create address', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format response
    const formattedAddress = {
      id: newAddress.id,
      label: newAddress.address_type === 'billing' ? 'Billing Address' : 'Shipping Address',
      fullName: newAddress.full_name,
      phone: newAddress.phone,
      street: newAddress.street_address,
      city: newAddress.city,
      province: newAddress.province,
      zip: newAddress.zip_code,
      default: newAddress.is_default,
    };

    return NextResponse.json({ address: formattedAddress }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/addresses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

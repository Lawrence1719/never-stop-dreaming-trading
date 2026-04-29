import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateZipCode } from '@/lib/utils/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * PATCH /api/addresses/[id]
 * Updates an existing address
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { street, city, cityCode, province, provinceCode, barangay, barangayCode, isDefault, zip } = body;

    // Build update object with only provided fields
    const updates: any = {};
    if (street !== undefined) updates.street_address = street;
    if (city !== undefined) updates.city = city;
    if (cityCode !== undefined) updates.city_code = cityCode;
    if (province !== undefined) updates.province = province;
    if (provinceCode !== undefined) updates.province_code = provinceCode;
    if (barangay !== undefined) updates.barangay = barangay;
    if (barangayCode !== undefined) updates.barangay_code = barangayCode;
    
    if (zip !== undefined) {
      if (!validateZipCode(zip)) {
        return NextResponse.json({ error: 'Zip code must be exactly 4 digits' }, { status: 400 });
      }
      updates.zip_code = zip;
    }

    // If setting as default, unset other defaults first
    if (isDefault === true) {
      await supabaseClient
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
      updates.is_default = true;
    }

    // Update address (only if it belongs to the user)
    const { data: updatedAddress, error } = await supabaseClient
      .from('addresses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update address', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Format response
    const formattedAddress = {
      id: updatedAddress.id,
      label: updatedAddress.address_type === 'billing' ? 'Billing Address' : 'Shipping Address',
      fullName: updatedAddress.full_name,
      phone: updatedAddress.phone,
      street: updatedAddress.street_address,
      city: updatedAddress.city,
      cityCode: updatedAddress.city_code,
      province: updatedAddress.province,
      provinceCode: updatedAddress.province_code,
      barangay: updatedAddress.barangay,
      barangayCode: updatedAddress.barangay_code,
      zip: updatedAddress.zip_code,
      default: updatedAddress.is_default,
    };

    return NextResponse.json({ address: formattedAddress }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/addresses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/addresses/[id]
 * Deletes an address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Delete address (only if it belongs to the user)
    const { error } = await supabaseClient
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete address', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/addresses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

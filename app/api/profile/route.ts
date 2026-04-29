import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { validatePhoneNumber } from '@/lib/utils/validation';

/**
 * Priority 1: Customer Profile Update Endpoint
 * Allows a user to update their own name and phone number.
 */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Create client with user's token for auth check
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
  }

  try {
    const { name, phone } = await request.json();

    // 1. Validate Name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 2. Validate PH Phone Format (starts with 9, exactly 10 digits)
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!validatePhoneNumber(phone)) {
      return NextResponse.json({ 
        error: 'Invalid phone format. Must be 10 digits starting with 9 (e.g., 9123456789).' 
      }, { status: 400 });
    }

    const supabaseAdmin = getClient();

    // 3. Update profile in database (specifically for this user)
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''), // Save only digits
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Update user metadata in auth for consistency
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { 
        name: name.trim(), 
        phone: phone.replace(/\D/g, '') 
      }
    });

    if (authUpdateError) {
      console.warn('Failed to update auth metadata:', authUpdateError);
      // We don't return error here because the profile table was updated successfully
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

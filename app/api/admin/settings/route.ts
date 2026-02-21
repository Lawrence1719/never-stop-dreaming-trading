import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch settings from database
    let settings: Record<string, any> = {};

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('key, value');

    if (settingsError) {
      // Settings table might not exist, use defaults
      console.warn('Settings table not found, using defaults', settingsError);
    } else if (settingsData) {
      settingsData.forEach((row: any) => {
        // Parse boolean strings
        if (row.value === 'true') {
          settings[row.key] = true;
        } else if (row.value === 'false') {
          settings[row.key] = false;
        } else {
          settings[row.key] = row.value;
        }
      });
    }

    // Return settings with defaults
    return NextResponse.json({
      general: {
        storeName: settings.store_name || 'Never Stop Dreaming Trading',
        tagline: settings.tagline || 'Your trusted online store',
        contactEmail: settings.contact_email || 'contact@example.com',
        contactPhone: settings.contact_phone || '+1 234 567 8900',
        businessAddress: settings.business_address || '123 Main Street, City, State 12345',
      },
      shipping: {
        standardRate: settings.shipping_standard_rate || '299.00',
        expressRate: settings.shipping_express_rate || '599.00',
        freeShippingThreshold: settings.shipping_free_threshold || '2500.00',
      },
      payment: {
        creditCard: settings.payment_credit_card !== false,
        cashOnDelivery: settings.payment_cash_on_delivery !== false,
        bankTransfer: settings.payment_bank_transfer === true,
      },
      system: {
        maintenanceMode: settings.maintenance_mode === true,
        enableCustomerRegistration: settings.enable_customer_registration !== false,
        enableProductReviews: settings.enable_product_reviews !== false,
        enableWishlist: settings.enable_wishlist !== false,
      },
    });
  } catch (error) {
    console.error('Failed to load settings', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { section, settings: settingsData } = body;

    if (!section || !settingsData) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Map settings to database keys
    const settingsMap: Record<string, any> = {};

    if (section === 'general') {
      settingsMap.store_name = settingsData.storeName;
      settingsMap.tagline = settingsData.tagline;
      settingsMap.contact_email = settingsData.contactEmail;
      settingsMap.contact_phone = settingsData.contactPhone;
      settingsMap.business_address = settingsData.businessAddress;
    } else if (section === 'shipping') {
      settingsMap.shipping_standard_rate = settingsData.standardRate;
      settingsMap.shipping_express_rate = settingsData.expressRate;
      settingsMap.shipping_free_threshold = settingsData.freeShippingThreshold;
    } else if (section === 'payment') {
      settingsMap.payment_credit_card = settingsData.creditCard;
      settingsMap.payment_cash_on_delivery = settingsData.cashOnDelivery;
      settingsMap.payment_bank_transfer = settingsData.bankTransfer;
    } else if (section === 'system') {
      settingsMap.maintenance_mode = settingsData.maintenanceMode;
      settingsMap.enable_customer_registration = settingsData.enableCustomerRegistration;
      settingsMap.enable_product_reviews = settingsData.enableProductReviews;
      settingsMap.enable_wishlist = settingsData.enableWishlist;
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(settingsMap)) {
      const valueStr = typeof value === 'boolean' ? String(value) : String(value);
      const { error: upsertError } = await supabaseAdmin
        .from('settings')
        .upsert(
          {
            key,
            value: valueStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (upsertError) {
        console.error(`Failed to save setting ${key}:`, upsertError);
        return NextResponse.json({ error: `Failed to save setting: ${upsertError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}


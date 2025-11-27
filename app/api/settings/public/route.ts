import { NextResponse } from 'next/server';
import { getClient } from '@/lib/supabase/admin';

/**
 * Public API endpoint to fetch public-facing settings
 * No authentication required - these are public settings
 */
export async function GET() {
  try {
    const supabase = getClient();
    
    // Fetch only public settings from database
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'store_name',
        'tagline',
        'contact_email',
        'contact_phone',
        'business_address',
        'shipping_standard_rate',
        'shipping_express_rate',
        'shipping_free_threshold',
        'payment_credit_card',
        'payment_cash_on_delivery',
        'payment_bank_transfer',
      ]);

    const settings: Record<string, any> = {};

    if (settingsData) {
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

    // Return public settings with defaults
    return NextResponse.json({
      general: {
        storeName: settings.store_name || 'Never Stop Dreaming Trading',
        tagline: settings.tagline || 'Your trusted online store',
        contactEmail: settings.contact_email || 'contact@example.com',
        contactPhone: settings.contact_phone || '+1 234 567 8900',
        businessAddress: settings.business_address || '123 Main Street, City, State 12345',
      },
      shipping: {
        standardRate: settings.shipping_standard_rate || '5.00',
        expressRate: settings.shipping_express_rate || '15.00',
        freeShippingThreshold: settings.shipping_free_threshold || '50.00',
      },
      payment: {
        creditCard: settings.payment_credit_card !== false,
        cashOnDelivery: settings.payment_cash_on_delivery !== false,
        bankTransfer: settings.payment_bank_transfer === true,
      },
    });
  } catch (error) {
    console.error('Failed to load public settings', error);
    // Return defaults on error
    return NextResponse.json({
      general: {
        storeName: 'Never Stop Dreaming Trading',
        tagline: 'Your trusted online store',
        contactEmail: 'contact@example.com',
        contactPhone: '+1 234 567 8900',
        businessAddress: '123 Main Street, City, State 12345',
      },
      shipping: {
        standardRate: '5.00',
        expressRate: '15.00',
        freeShippingThreshold: '50.00',
      },
      payment: {
        creditCard: true,
        cashOnDelivery: true,
        bankTransfer: false,
      },
    });
  }
}


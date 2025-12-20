/**
 * Utility functions for accessing application settings
 */

import { getClient } from '@/lib/supabase/admin';

export interface AppSettings {
  general: {
    storeName: string;
    tagline: string;
    contactEmail: string;
    contactPhone: string;
    businessAddress: string;
  };
  shipping: {
    standardRate: string;
    expressRate: string;
    freeShippingThreshold: string;
  };
  payment: {
    creditCard: boolean;
    cashOnDelivery: boolean;
    bankTransfer: boolean;
  };
  system: {
    maintenanceMode: boolean;
    enableCustomerRegistration: boolean;
    enableProductReviews: boolean;
    enableWishlist: boolean;
  };
}

/**
 * Get application settings from the database
 * This function can be used in server components or API routes
 */
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = getClient();
  
  const { data: settingsData } = await supabase
    .from('settings')
    .select('key, value');

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

  // Return settings with defaults
  return {
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
    system: {
      maintenanceMode: settings.maintenance_mode === true,
      enableCustomerRegistration: settings.enable_customer_registration !== false,
      enableProductReviews: settings.enable_product_reviews !== false,
      enableWishlist: settings.enable_wishlist !== false,
    },
  };
}








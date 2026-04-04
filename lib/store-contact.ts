/**
 * Canonical storefront / contact details for the public site and map.
 * Set NEXT_PUBLIC_STORE_LAT and NEXT_PUBLIC_STORE_LNG to your verified GPS coordinates (decimal degrees).
 */
export const STORE_DISPLAY_NAME = 'Never Stop Dreaming';

/** As listed on Google Maps (warehouse) */
export const STORE_LISTING_NAME = 'NSD (Joefran)';

export const STORE_CONTACT = {
  storeName: STORE_DISPLAY_NAME,
  /** Shown on map popup with store name */
  listingName: STORE_LISTING_NAME,
  listingCategory: 'Warehouse' as const,
  email: 'support@neverstoptrading.com',
  phone: '9123456789',
  phoneTelHref: 'tel:+639123456789',
  /** Single-line mailing address shown on Contact, map popup, and footer-style blocks */
  address: 'Purok 1, Tamacan, Amadeo, Cavite, Philippines',
  hoursWeekdayLabel: 'Monday – Friday',
  hoursWeekdayTime: '9:00 AM – 6:00 PM PHT',
  hoursWeekendLabel: 'Saturday – Sunday',
  hoursWeekendTime: '10:00 AM – 4:00 PM PHT',
  /** Amadeo warehouse — override via NEXT_PUBLIC_STORE_LAT / NEXT_PUBLIC_STORE_LNG if you move pins */
  latitude: Number(process.env.NEXT_PUBLIC_STORE_LAT ?? '14.2132943'),
  longitude: Number(process.env.NEXT_PUBLIC_STORE_LNG ?? '120.9285199'),
  /** Default map zoom; matches typical street-level view for this site */
  mapZoom: Number(process.env.NEXT_PUBLIC_STORE_MAP_ZOOM ?? '17'),
} as const;

export function storeHoursSummary(): string {
  return (
    `${STORE_CONTACT.hoursWeekdayLabel}: ${STORE_CONTACT.hoursWeekdayTime}\n` +
    `${STORE_CONTACT.hoursWeekendLabel}: ${STORE_CONTACT.hoursWeekendTime}`
  );
}

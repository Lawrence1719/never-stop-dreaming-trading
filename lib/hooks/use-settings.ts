'use client';

import { useState, useEffect } from 'react';

interface PublicSettings {
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
}

/**
 * Hook to fetch and use public settings
 * Caches settings in memory to avoid repeated API calls
 */
let cachedSettings: PublicSettings | null = null;
let cacheTimestamp: number = 0;
let settingsPromise: Promise<PublicSettings> | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export function useSettings() {
  const [settings, setSettings] = useState<PublicSettings | null>(cachedSettings);
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    const fetchSettings = () => {
      const now = Date.now();
      const isCacheStale = !cachedSettings || (now - cacheTimestamp) > CACHE_DURATION;
      
      // If we have fresh cached settings, use them immediately
      if (cachedSettings && !isCacheStale) {
        setSettings(cachedSettings);
        setIsLoading(false);
        return;
      }
      
      // If cache is stale, clear it
      if (isCacheStale) {
        cachedSettings = null;
        cacheTimestamp = 0;
      }

      // If there's already a request in progress, wait for it
      if (settingsPromise) {
        settingsPromise.then((data) => {
          cachedSettings = data;
          cacheTimestamp = Date.now();
          setSettings(data);
          setIsLoading(false);
        });
        return;
      }

      // Fetch settings
      setIsLoading(true);
      settingsPromise = fetch('/api/settings/public')
        .then((res) => res.json())
        .then((data) => {
          cachedSettings = data;
          cacheTimestamp = Date.now();
          setSettings(data);
          setIsLoading(false);
          return data;
        })
        .catch((error) => {
          console.error('Failed to load settings', error);
          // Return defaults on error
          const defaults: PublicSettings = {
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
          };
          cachedSettings = defaults;
          cacheTimestamp = Date.now();
          setSettings(defaults);
          setIsLoading(false);
          return defaults;
        })
        .finally(() => {
          settingsPromise = null;
        });
    };

    fetchSettings();

    // Refresh settings when window regains focus (user switches back to tab)
    const handleFocus = () => {
      const now = Date.now();
      // Only refresh if cache is older than 30 seconds when window regains focus
      if (!cachedSettings || (now - cacheTimestamp) > 30000) {
        cachedSettings = null;
        cacheTimestamp = 0;
        fetchSettings();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return { settings, isLoading };
}

/**
 * Clear cached settings (useful after admin updates settings)
 */
export function clearSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
  settingsPromise = null;
}

/**
 * Force refresh settings from the server
 */
export function refreshSettings(): Promise<PublicSettings> {
  cachedSettings = null;
  cacheTimestamp = 0;
  settingsPromise = null;
  
  return fetch('/api/settings/public')
    .then((res) => res.json())
    .then((data) => {
      cachedSettings = data;
      cacheTimestamp = Date.now();
      return data;
    })
    .catch((error) => {
      console.error('Failed to refresh settings', error);
      throw error;
    });
}


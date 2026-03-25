import { supabase } from '@/lib/supabase/client';

/**
 * Service for tracking banner performance analytics.
 * These functions call Supabase RPCs for atomic increments.
 * 
 * Required SQL for RPCs:
 * 
 * create or replace function increment_banner_impressions(banner_id uuid)
 * returns void as $$
 * begin
 *   update public.banners
 *   set impressions = impressions + 1
 *   where id = banner_id;
 * end;
 * $$ language plpgsql;
 * 
 * create or replace function increment_banner_clicks(banner_id uuid)
 * returns void as $$
 * begin
 *   update public.banners
 *   set clicks = clicks + 1
 *   where id = banner_id;
 * end;
 * $$ language plpgsql;
 */

export const BannerTracking = {
  /**
   * Increments the impression count for a banner.
   * Call this when a banner is rendered on the screen.
   */
  async recordImpression(bannerId: string) {
    try {
      const { error } = await supabase.rpc('increment_banner_impressions', {
        banner_id: bannerId
      });
      if (error) {
        // Fallback to direct update if RPC fails (assuming non-atomic is acceptable as fallback)
        console.warn('Impression RPC failed, attempting direct update:', error);
        await supabase
          .from('banners')
          .update({ impressions: supabase.rpc('increment', { row_id: bannerId, column_name: 'impressions' }) })
          // Note: The above is a placeholder for how one might try direct update, 
          // but RPC is the primary recommended method for atomic increments.
      }
    } catch (err) {
      console.error('Failed to record banner impression:', err);
    }
  },

  /**
   * Increments the click count for a banner.
   * Call this when a banner is clicked.
   */
  async recordClick(bannerId: string) {
    try {
      const { error } = await supabase.rpc('increment_banner_clicks', {
        banner_id: bannerId
      });
      if (error) {
        console.warn('Click RPC failed:', error);
      }
    } catch (err) {
      console.error('Failed to record banner click:', err);
    }
  }
};

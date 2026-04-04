import { useState, useEffect, useCallback, useId } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/auth-context';

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'stock' | 'user' | 'system';
  is_read: boolean;
  link: string | null;
  target_role: 'customer' | 'admin';
  created_at: string;
};

export function useNotifications(
  targetRole: 'customer' | 'admin' = 'customer',
  options: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'unread' | 'read';
    enabled?: boolean;
  } = {}
) {
  const { user } = useAuth();
  const instanceId = useId();
  const { page = 0, limit = 10, filter = 'all', enabled = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadStockCount, setUnreadStockCount] = useState(0);
  const [unreadWarningCount, setUnreadWarningCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    // Fetch generic unread count
    const { count: totalUnread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('target_role', targetRole)
      .eq('is_read', false);
    
    if (totalUnread !== null) setUnreadCount(totalUnread);

    // Fetch unread stock alerts
    const { count: stockUnread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('target_role', targetRole)
      .eq('type', 'stock')
      .eq('is_read', false);
    
    if (stockUnread !== null) setUnreadStockCount(stockUnread);

    // Fetch unread warnings/errors
    const { count: warningsUnread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('target_role', targetRole)
      .in('type', ['warning', 'error'])
      .eq('is_read', false);
    
    if (warningsUnread !== null) setUnreadWarningCount(warningsUnread);

  }, [user, targetRole]);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user || !enabled) return;
    if (!silent) setLoading(true);

    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('target_role', targetRole)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'read') {
        query = query.eq('is_read', true);
      }

      const from = page * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setNotifications(data || []);
      if (count !== null) setTotalCount(count);
      
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, targetRole, page, limit, filter, enabled, fetchUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user || !enabled) return;

    // Clean up channel name by removing any characters that might be invalid
    const cleanId = instanceId.replace(/[^a-zA-Z0-9]/g, '_');
    const channel = supabase
      .channel(`notifications:${user.id}:${targetRole}:${cleanId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.info(`[notifications v3] Realtime ${payload.eventType} for ${targetRole}`);
          
          // Re-fetch silently to update the unread count and list
          fetchNotifications(true);
        }
      )
      .subscribe((status) => {
        console.info(`[notifications v3] Realtime status for ${targetRole}:`, status);
        if (status === 'SUBSCRIBED') {
          // Silent refresh once subscribed to catch anything missed during connection
          fetchNotifications(true);
        }
      });

    return () => {
      console.info(`[notifications v3] Unsubscribing from ${targetRole}`);
      supabase.removeChannel(channel);
    };
  }, [user, targetRole, enabled, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('target_role', targetRole)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setUnreadStockCount(0);
      setUnreadWarningCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      await fetchUnreadCount();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    unreadStockCount,
    unreadWarningCount,
    totalCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
}

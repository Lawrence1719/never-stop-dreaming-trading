"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from "react";
import { User, Profile } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ error: Error | null }>;
  updateProfile: (name: string, phone: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: () => Promise<{ error: Error | null }>;
  requestCustomerPasswordReset: () => Promise<{ error: Error | null }>;

  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePreferences: (preferences: User['notification_preferences']) => Promise<{ error: Error | null }>;
  restoreAccount: () => Promise<{ error: Error | null }>;
  isDeletionPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileFetchInProgressRef = useRef(false);
  const cachedUserIdRef = useRef<string | null>(null);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (session: Session) => {
    // Skip if already fetching for this user
    if (profileFetchInProgressRef.current && cachedUserIdRef.current === session.user.id) {
      return;
    }

    // Skip if we already have this user's profile
    if (user && cachedUserIdRef.current === session.user.id) {
      return;
    }

    // mark loading and in-progress
    profileFetchInProgressRef.current = true;
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // TODO: Remove after all legacy users have profiles confirmed.
      // If profile doesn't exist, create it
      if (error && (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found'))) {
        const userMetadata = session.user.user_metadata || {};
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
            phone: userMetadata.phone || null,
            role: userMetadata.role || 'customer',
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating profile:", insertError);
          const userData: User = {
            id: session.user.id,
            email: session.user.email || "",
            name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
            phone: userMetadata.phone || "",
            memberSince: new Date().toISOString(),
            addresses: [],
            role: (userMetadata.role as 'admin' | 'customer' | 'courier') || 'customer',
          };
          setUser(userData);
          cachedUserIdRef.current = session.user.id;
          return;
        }

        if (newProfile) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || "",
            name: newProfile.name,
            phone: newProfile.phone || "",
            memberSince: newProfile.created_at,
            addresses: [],
            role: newProfile.role,
            notification_preferences: newProfile.notification_preferences,
            deleted_at: newProfile.deleted_at,
          };
          setUser(userData);
          cachedUserIdRef.current = session.user.id;
          return;
        }
      }

      if (error) {
        console.error("Error fetching user profile:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        const userMetadata = session.user.user_metadata || {};
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
          phone: userMetadata.phone || "",
          memberSince: new Date().toISOString(),
          addresses: [],
          role: (userMetadata.role as 'admin' | 'customer' | 'courier') || 'customer',
        };
        setUser(userData);
        cachedUserIdRef.current = session.user.id;
        return;
      }

      if (profile) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: profile.name,
          phone: profile.phone || "",
          memberSince: profile.created_at,
          addresses: [],
          role: profile.role,
          notification_preferences: profile.notification_preferences,
          deleted_at: profile.deleted_at,
        };
        setUser(userData);
        cachedUserIdRef.current = session.user.id;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      const userMetadata = session.user.user_metadata || {};
      const userData: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
        phone: userMetadata.phone || "",
        memberSince: new Date().toISOString(),
        addresses: [],
        role: (userMetadata.role as 'admin' | 'customer' | 'courier') || 'customer',
      };
      setUser(userData);
      cachedUserIdRef.current = session.user.id;
    } finally {
      profileFetchInProgressRef.current = false;
      // done loading profile
    }
  };

  const buildUserFromSession = (session: Session): User => {
    const userMetadata = session.user.user_metadata || {};
    return {
      id: session.user.id,
      email: session.user.email || "",
      name: (userMetadata.name as string) || session.user.email?.split('@')[0] || 'User',
      phone: (userMetadata.phone as string) || "",
      memberSince: new Date().toISOString(),
      addresses: [],
      role: (userMetadata.role as 'admin' | 'customer' | 'courier') || 'customer',
    };
  };

  useEffect(() => {
    // Check for existing session
    (async () => {
      try {
        const result = await supabase.auth.getSession();
        const { data: { session } } = result;

        if (session) {
          // Set a minimal user immediately to keep the UI state warm,
          // but REMAIN in isLoading=true until the role is verified from the profile
          setUser(buildUserFromSession(session));
          
          // Fetch the full profile (critical for role-based redirection)
          await fetchUserProfile(session);
          console.info('[auth v3] Session recovered and role verified');
        }
      } catch (err: any) {
        console.error('[auth v3] Initialization failed:', err);
        // Handle Invalid Refresh Token specifically
        if (err?.message?.includes('Refresh Token Not Found') || err?.message?.includes('invalid_grant')) {
          console.warn('[auth] Invalid refresh token detected during init, clearing storage');
          setUser(null);
          // Manually clear storage to stop the loop
          if (typeof window !== 'undefined') {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase') || key.includes('auth'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug(`[auth] onAuthStateChange event: ${event}`, { userId: session?.user?.id });
      
      if (event === 'SIGNED_OUT') {
        // Immediately clear user state on sign out
        setUser(null);
        cachedUserIdRef.current = null;
        profileFetchInProgressRef.current = false;
        setIsLoading(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        // Force a session refresh and profile fetch when recovering password
        if (session) {
          setUser(buildUserFromSession(session));
          fetchUserProfile(session).catch((err) => console.error('Error fetching profile on recovery', err));
        }
      } else if (session) {
        // Force re-fetch profile if user info might have changed
        // This ensures email changes or role updates are caught immediately
        setUser(buildUserFromSession(session));
        fetchUserProfile(session).catch((err) => console.error('Error fetching profile on auth change', err));
      } else {
        setUser(null);
        cachedUserIdRef.current = null;
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Auth context: Attempting login for email:', email);
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        throw new Error('Too many attempts. Please try again later.');
      }

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to login') };
      }

      if (data.session) {
        // Set minimal user immediately so UI doesn't wait for profile fetch
        setUser(buildUserFromSession(data.session));
        // Fetch the full profile in the background
        fetchUserProfile(data.session).catch((err) => console.error('Error fetching profile after login', err));
      }

      return { error: null };
    } catch (error) {
      console.error('Auth context: Unexpected error during login:', error);
      return { error: error as Error };
    }
  };

  const logout = async () => {
    try {
      // Immediately clear user state for faster UI response
      setIsLoading(true);
      setUser(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error logging out:", error);
        // Don't throw - we already cleared the user state
      }
      
      // Clear any cached auth data from localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoading(false);
      // Don't throw - we already cleared the user state
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
      });

      if (res.status === 429) {
        throw new Error('Too many attempts. Please try again later.');
      }

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to register') };
      }

      if (data.session) {
        // Set minimal user immediately and fetch profile in background
        setUser(buildUserFromSession(data.session));
        fetchUserProfile(data.session).catch((err) => console.error('Error fetching profile after register', err));
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateProfile = async (name: string, phone: string) => {
    if (!user) {
      return { error: new Error("User not authenticated") };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { error: new Error("No active session found") };
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: new Error(result.error || "Failed to update profile") };
      }

      // Update local user state
      setUser({
        ...user,
        name,
        phone,
      });

      return { error: null };
    } catch (error) {
      console.error("Profile update failed:", error);
      return { error: error as Error };
    }
  };

  const requestPasswordReset = async () => {
    if (!user?.email) {
      return { error: new Error("User not authenticated") };
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (res.status === 429) {
        return { error: new Error('Too many attempts. Please try again later.') };
      }

      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to send reset email') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const requestCustomerPasswordReset = async () => {
    if (!user?.email) {
      return { error: new Error("User not authenticated") };
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (res.status === 429) {
        return { error: new Error('Too many attempts. Please try again later.') };
      }

      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to send reset email') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePreferences = async (preferences: User['notification_preferences']) => {
    if (!user) return { error: new Error("User not authenticated") };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state immediately
      setUser({
        ...user,
        notification_preferences: preferences
      });

      return { error: null };
    } catch (error: any) {
      console.error("Failed to update preferences:", error);
      return { error };
    }
  };

  const restoreAccount = async () => {
    if (!user) return { error: new Error("User not authenticated") };

    try {
      const response = await fetch('/api/profile/restore', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Failed to restore account");

      // Update local state immediately
      setUser({
        ...user,
        deleted_at: null
      });

      return { error: null };
    } catch (error: any) {
      console.error("Failed to restore account:", error);
      return { error };
    }
  };

  const authValue = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    register,
    updateProfile,
    requestPasswordReset,
    requestCustomerPasswordReset,
    resendConfirmationEmail,
    updatePreferences,
    restoreAccount,
    isDeletionPending: !!user?.deleted_at
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
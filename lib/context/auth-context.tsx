"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (session: Session) => {
    setIsLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

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
            role: (userMetadata.role as 'admin' | 'customer') || 'customer',
          };
          setUser(userData);
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
          };
          setUser(userData);
          return;
        }
      }

      if (error) {
        console.error("Error fetching user profile:", error);
        const userMetadata = session.user.user_metadata || {};
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          name: userMetadata.name || session.user.email?.split('@')[0] || 'User',
          phone: userMetadata.phone || "",
          memberSince: new Date().toISOString(),
          addresses: [],
          role: (userMetadata.role as 'admin' | 'customer') || 'customer',
        };
        setUser(userData);
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
        };
        setUser(userData);
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
        role: (userMetadata.role as 'admin' | 'customer') || 'customer',
      };
      setUser(userData);
    } finally {
      setIsLoading(false);
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
      role: (userMetadata.role as 'admin' | 'customer') || 'customer',
    };
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Set a minimal user immediately so the UI responds quickly,
        // then fetch the full profile in the background to enrich the data.
        setUser(buildUserFromSession(session));
        fetchUserProfile(session).catch((err) => console.error('Error fetching profile on init', err));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Immediately clear user state on sign out
        setUser(null);
        setIsLoading(false);
      } else if (session) {
        // Set minimal user quickly and fetch profile in background
        setUser(buildUserFromSession(session));
        fetchUserProfile(session).catch((err) => console.error('Error fetching profile on auth change', err));
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.session) {
        // Set minimal user immediately so UI doesn't wait for profile fetch
        setUser(buildUserFromSession(data.session));
        // Fetch the full profile in the background
        fetchUserProfile(data.session).catch((err) => console.error('Error fetching profile after login', err));
      }

      return { error: null };
    } catch (error) {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: "customer",
          },
        },
      });

      if (error) {
        return { error };
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
      const { error } = await supabase
        .from("profiles")
        .update({ name, phone })
        .eq("id", user.id);

      if (error) {
        return { error };
      }

      // Update local user state
      setUser({
        ...user,
        name,
        phone,
      });

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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateProfile, resendConfirmationEmail }}>
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
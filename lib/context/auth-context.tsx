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
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // If profile doesn't exist, create it
      // PGRST116 = no rows returned, or check error message
      if (error && (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found'))) {
        // Profile doesn't exist, create it
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
          // Still set user with basic info from session
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

        // Use the newly created profile
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
        // Still set user with basic info from session even if profile fetch fails
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
      // Fallback: set user with basic info from session
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
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchUserProfile(session);
      } else {
        setUser(null);
      }
      setIsLoading(false);
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
        await fetchUserProfile(data.session);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error);
        throw error;
      }
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
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
        await fetchUserProfile(data.session);
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

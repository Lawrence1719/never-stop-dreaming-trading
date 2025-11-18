"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  register: (name: string, email: string, phone: string, password: string) => void;
  updateProfile: (name: string, phone: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    const mockUser: User = {
      id: "user-1",
      email,
      name: email.split("@")[0],
      phone: "+1 (555) 000-0000",
      memberSince: new Date().toISOString(),
      addresses: [],
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const register = (name: string, email: string, phone: string, password: string) => {
    const mockUser: User = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      email,
      name,
      phone,
      memberSince: new Date().toISOString(),
      addresses: [],
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const updateProfile = (name: string, phone: string) => {
    if (user) {
      const updated = { ...user, name, phone };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateProfile }}>
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

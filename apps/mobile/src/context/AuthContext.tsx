// apps/mobile/src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@nce/api";
import { ActivityIndicator, View } from "react-native";
import { initAuth } from "../services/auth-init";
import { router, useSegments } from "expo-router";

// Ensure auth is initialized once
initAuth();

interface AuthContextType {
  user: any;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Load initial user state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Protected Route Logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Redirect to the login screen
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // Redirect to the home screen
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  const signIn = async (email: string, password: string) => {
    await authService.login(email, password);
    // After login, fetch user profile to update state
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

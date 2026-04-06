import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, type AuthUser } from "@/services/api";

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null; // same object, kept for API compatibility
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem("auth_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await authApi.signUp(email, password, fullName);
      localStorage.setItem("auth_token", res.token);
      setUser(res.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await authApi.signIn(email, password);
      localStorage.setItem("auth_token", res.token);
      setUser(res.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const updateProfile = async (
    updates: Partial<AuthUser>
  ): Promise<{ error: Error | null }> => {
    try {
      const updated = await authApi.updateProfile(updates);
      setUser(updated);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user, // alias — components reference both
        isLoading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

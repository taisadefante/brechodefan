"use client";

import { auth } from "@/lib/firebase";
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ||
  "taisadefante@hotmail.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAdmin,

      login: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();

        await signInWithEmailAndPassword(auth, cleanEmail, password);
      },

      register: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();

        if (cleanEmail === ADMIN_EMAIL) {
          throw new Error("Este e-mail é reservado para administração.");
        }

        return await createUserWithEmailAndPassword(auth, cleanEmail, password);
      },

      resetPassword: async (email) => {
        const cleanEmail = email.trim().toLowerCase();

        await sendPasswordResetEmail(auth, cleanEmail);
      },

      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, loading, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de AuthProvider");
  }

  return ctx;
}
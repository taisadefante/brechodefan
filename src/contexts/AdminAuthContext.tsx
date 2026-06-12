"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { adminAuth } from "@/lib/firebase-admin-auth";

type AdminAuthContextType = {
  adminUser: User | null;
  loadingAdmin: boolean;
  isAdmin: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ||
  "taisadefante@hotmail.com";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const isAdmin =
    !!adminUser?.email && adminUser.email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    setPersistence(adminAuth, browserLocalPersistence).catch((error) => {
      console.error("Erro ao configurar persistência do admin:", error);
    });

    const unsubscribe = onAuthStateChanged(adminAuth, (currentUser) => {
      setAdminUser(currentUser);
      setLoadingAdmin(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AdminAuthContextType>(
    () => ({
      adminUser,
      loadingAdmin,
      isAdmin,

      adminLogin: async (email, password) => {
        await setPersistence(adminAuth, browserLocalPersistence);
        await signInWithEmailAndPassword(
          adminAuth,
          email.trim().toLowerCase(),
          password,
        );
      },

      adminLogout: async () => {
        await signOut(adminAuth);
      },
    }),
    [adminUser, loadingAdmin, isAdmin],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);

  if (!ctx) {
    throw new Error("useAdminAuth precisa estar dentro de AdminAuthProvider");
  }

  return ctx;
}
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

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
    setPersistence(auth, browserSessionPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (
        currentUser?.email &&
        currentUser.email.toLowerCase() !== ADMIN_EMAIL
      ) {
        signOut(auth).catch(() => null);
        setAdminUser(null);
        setLoadingAdmin(false);
        return;
      }

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
        const cleanEmail = email.trim().toLowerCase();

        if (cleanEmail !== ADMIN_EMAIL) {
          throw new Error("Este e-mail não tem acesso ao painel administrativo.");
        }

        await setPersistence(auth, browserSessionPersistence);
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      },

      adminLogout: async () => {
        await signOut(auth);
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
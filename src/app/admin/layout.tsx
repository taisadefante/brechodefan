"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LogOut, Package, ShoppingBag } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/lib/theme";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  const showMenu = Boolean(user && isAdmin);

  function menuButtonStyle(active: boolean): React.CSSProperties {
    return {
      background: active ? theme.brown : "transparent",
      color: active ? "#fff" : theme.brownDark,
      borderRadius: 999,
      border: active ? "none" : "1px solid #6c757d",
      fontWeight: 600,
    };
  }

  return (
    <>
      {showMenu && (
        <div className="container pt-5">
          <div
            className="mb-4 p-4"
            style={{
              background: theme.ivory2,
              borderRadius: 24,
              boxShadow: theme.shadow,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div className="text-center">
              <h1 className="fw-bold mb-1">Admin Defan Brechó</h1>

              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Escolha uma área para gerenciar.
              </p>
            </div>

            <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
              <Link
                href="/admin"
                className="btn"
                style={menuButtonStyle(pathname === "/admin")}
              >
                <BarChart3 size={16} className="me-1" />
                Painel
              </Link>

              <Link
                href="/admin/produtos"
                className="btn"
                style={menuButtonStyle(pathname === "/admin/produtos")}
              >
                <Package size={16} className="me-1" />
                Produtos
              </Link>

              <Link
                href="/admin/vendas"
                className="btn"
                style={menuButtonStyle(pathname === "/admin/vendas")}
              >
                <ShoppingBag size={16} className="me-1" />
                Vendas
              </Link>

              <button
                type="button"
                onClick={logout}
                className="btn btn-outline-danger"
                style={{ borderRadius: 999 }}
              >
                <LogOut size={16} className="me-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
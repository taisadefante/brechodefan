"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  DollarSign,
  LogOut,
  Package,
  ShoppingBag,
} from "lucide-react";

import {
  AdminAuthProvider,
  useAdminAuth,
} from "@/contexts/AdminAuthContext";

import { theme } from "@/lib/theme";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { adminUser, loadingAdmin, isAdmin, adminLogout } = useAdminAuth();

  const showMenu = Boolean(adminUser && isAdmin);

  function menuButtonStyle(active: boolean): React.CSSProperties {
    return {
      background: active ? theme.brown : "#fff",
      color: active ? "#fff" : theme.brownDark,
      borderRadius: 999,
      border: active ? `1px solid ${theme.brown}` : `1px solid ${theme.border}`,
      fontWeight: 700,
      padding: "10px 18px",
      boxShadow: active ? "0 8px 20px rgba(0,0,0,0.12)" : "none",
    };
  }

  if (loadingAdmin) {
    return <main className="container py-5">Carregando...</main>;
  }

  return (
    <>
      {showMenu && (
        <header
          className="mb-4"
          style={{
            background: theme.ivory2,
            borderBottom: `1px solid ${theme.border}`,
            boxShadow: theme.shadow,
          }}
        >
          <div className="container py-4">
            <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <Link
                href="/admin"
                className="d-flex align-items-center gap-3 text-decoration-none"
              >
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: "50%",
                    background: "#fff",
                    border: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="Defan Brechó"
                    width={64}
                    height={64}
                    style={{ objectFit: "contain" }}
                    priority
                  />
                </div>

                <div>
                  <h1
                    className="fw-bold mb-0"
                    style={{
                      color: theme.brownDark,
                      fontSize: "1.45rem",
                    }}
                  >
                    Admin Defan Brechó
                  </h1>

                  <small style={{ color: theme.brownSoft }}>
                    Área administrativa da loja
                  </small>
                </div>
              </Link>

              <button
                type="button"
                onClick={adminLogout}
                className="btn btn-outline-danger"
                style={{
                  borderRadius: 999,
                  fontWeight: 700,
                  padding: "10px 18px",
                }}
              >
                <LogOut size={16} className="me-1" />
                Sair
              </button>
            </div>

            <nav className="d-flex flex-wrap justify-content-center gap-2 mt-4">
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

              <Link
                href="/admin/faturamento"
                className="btn"
                style={menuButtonStyle(pathname === "/admin/faturamento")}
              >
                <DollarSign size={16} className="me-1" />
                Faturamento
              </Link>
            </nav>
          </div>
        </header>
      )}

      {children}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
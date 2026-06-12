"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock, LogOut } from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

import { adminAuth } from "@/lib/firebase-admin-auth";
import { getAllSales, getProducts } from "@/lib/firestore";
import { Product, Sale } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ||
  "taisadefante@hotmail.com";

function AdminContent() {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [logging, setLogging] = useState(false);

  const isAdmin =
    !!adminUser?.email && adminUser.email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(adminAuth, (currentUser) => {
      setAdminUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function load() {
    try {
      const [productsList, salesList] = await Promise.all([
        getProducts(true),
        getAllSales(),
      ]);

      setProducts(productsList);
      setSales(salesList);
    } catch (error) {
      console.error("Erro ao carregar painel admin:", error);
    }
  }

  useEffect(() => {
    if (adminUser && isAdmin) {
      load();
    }
  }, [adminUser, isAdmin]);

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setLogging(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (cleanEmail !== ADMIN_EMAIL) {
        setErro("Este e-mail não tem acesso ao painel administrativo.");
        return;
      }

      await signInWithEmailAndPassword(adminAuth, cleanEmail, password);
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLogging(false);
    }
  }

  async function handleAdminLogout() {
    await signOut(adminAuth);
    setProducts([]);
    setSales([]);
  }

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    const validSales = sales.filter((sale) => sale.status !== "cancelado");

    const monthSales = validSales.filter((sale) => {
      const date = new Date(sale.createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    return {
      available: products.filter((product) => product.status === "disponivel")
        .length,
      reserved: products.filter((product) => product.status === "reservado")
        .length,
      sold: products.filter((product) => product.status === "vendido").length,
      archived: products.filter((product) => product.status === "arquivado")
        .length,
      stock: products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0,
      ),
      salesCount: validSales.length,
      revenue: monthSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
    };
  }, [products, sales]);

  if (loading) {
    return <main className="container pb-5">Carregando...</main>;
  }

  if (!adminUser || !isAdmin) {
    return (
      <main className="container py-5" style={{ maxWidth: 520 }}>
        <div
          className="p-4"
          style={{
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div className="text-center mb-4">
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center"
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: theme.brown,
                color: "#fff",
              }}
            >
              <Lock size={26} />
            </div>

            <h1 className="fw-bold mb-1">Admin Defan Brechó</h1>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Acesso exclusivo da administração.
            </p>
          </div>

          {erro && <div className="alert alert-danger">{erro}</div>}

          <form onSubmit={handleAdminLogin}>
            <label className="form-label">E-mail administrativo</label>

            <input
              className="form-control mb-3"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="form-label">Senha</label>

            <div className="input-group mb-3">
              <input
                className="form-control"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={logging}
              className="btn w-100"
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
              }}
            >
              {logging ? "Entrando..." : "Entrar no admin"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container pb-5">
      <div
        className="mb-4 p-4 text-center"
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <div className="text-start">
            <h1 className="fw-bold mb-1">Painel Administrativo</h1>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Visão geral da loja e das vendas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="btn btn-outline-secondary"
            style={{ borderRadius: 999 }}
          >
            <LogOut size={16} className="me-1" />
            Sair do admin
          </button>
        </div>
      </div>

      <div className="row g-3">
        {[
          ["Produtos disponíveis", stats.available],
          ["Produtos reservados", stats.reserved],
          ["Produtos vendidos", stats.sold],
          ["Produtos arquivados", stats.archived],
          ["Estoque total", stats.stock],
          ["Vendas registradas", stats.salesCount],
          ["Faturamento mensal", formatMoney(stats.revenue)],
        ].map(([label, value]) => (
          <div className="col-md-4" key={String(label)}>
            <div
              className="p-4 h-100"
              style={{
                background: theme.ivory2,
                borderRadius: 24,
                boxShadow: theme.shadow,
                border: `1px solid ${theme.border}`,
              }}
            >
              <small style={{ color: theme.brownSoft }}>{label}</small>
              <h3 className="fw-bold mb-0">{value}</h3>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <AdminContent />
    </Suspense>
  );
}
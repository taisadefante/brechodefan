"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  approveCancelSale,
  getAllSales,
  updateSaleStatus,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Sale, SaleStatus } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { Package, ShoppingBag, LogOut } from "lucide-react";

const statuses: SaleStatus[] = [
  "aguardando_pagamento",
  "pago",
  "separando",
  "pronto_retirada",
  "enviado",
  "entregue",
  "cancelamento_solicitado",
  "cancelado",
];

export default function AdminVendasPage() {
  const { user, loading, isAdmin, login, logout } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("taisadefante@hotmail.com");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [logging, setLogging] = useState(false);

  async function load() {
    setSales(await getAllSales());
  }

  useEffect(() => {
    if (user && isAdmin) {
      load();
    }
  }, [user, isAdmin]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setLogging(true);

    try {
      if (email.trim().toLowerCase() !== "taisadefante@hotmail.com") {
        setErro("Este e-mail não tem acesso ao painel administrativo.");
        return;
      }

      await login(email.trim(), password);
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLogging(false);
    }
  }

  async function changeStatus(id: string, status: SaleStatus) {
    await updateSaleStatus(id, status, tracking[id]);
    await load();
  }

  async function approveCancel(id: string) {
    if (!confirm("Aprovar cancelamento e liberar produtos?")) return;
    await approveCancelSale(id);
    await load();
  }

  if (loading) {
    return <main className="container py-5">Carregando...</main>;
  }

  if (!user || !isAdmin) {
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
          <h1 className="fw-bold mb-1 text-center">Admin Defan Brechó</h1>
          <p className="text-center" style={{ color: theme.brownSoft }}>
            Faça login para acessar as vendas.
          </p>

          {erro && <div className="alert alert-danger">{erro}</div>}

          <form onSubmit={handleAdminLogin}>
            <label className="form-label">E-mail administrativo</label>
            <input
              className="form-control mb-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="form-label">Senha</label>
            <input
              className="form-control mb-3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <button
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

          <Link
            href="/"
            className="btn btn-link w-100 mt-3"
            style={{ color: theme.brown }}
          >
            Voltar para a loja
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-5">
      <div
        className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 p-3"
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div>
          <h1 className="fw-bold mb-0">Admin Defan Brechó</h1>
          <p className="mb-0" style={{ color: theme.brownSoft }}>
            Gerencie produtos e vendas.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="btn btn-outline-secondary"
            style={{ borderRadius: 999 }}
          >
            <Package size={16} className="me-1" />
            Produtos
          </Link>

          <Link
            href="/admin/vendas"
            className="btn"
            style={{
              background: theme.brown,
              color: "#fff",
              borderRadius: 999,
            }}
          >
            <ShoppingBag size={16} className="me-1" />
            Vendas
          </Link>

          <button
            onClick={logout}
            className="btn btn-outline-danger"
            style={{ borderRadius: 999 }}
          >
            <LogOut size={16} className="me-1" />
            Sair
          </button>
        </div>
      </div>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="fw-bold mb-1">Vendas</h2>
            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Altere o andamento da venda. O cliente verá automaticamente na
              conta dele.
            </p>
          </div>

          <button
            onClick={load}
            className="btn btn-sm"
            style={{
              background: theme.brownDark,
              color: "#fff",
              borderRadius: 999,
            }}
          >
            Atualizar
          </button>
        </div>

        {sales.map((sale) => (
          <div
            key={sale.id}
            className="p-4 mb-3"
            style={{
              background: theme.ivory2,
              borderRadius: 26,
              boxShadow: theme.shadow,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div className="d-flex flex-wrap justify-content-between gap-3">
              <div>
                <h5 className="fw-bold">Pedido #{sale.id.slice(0, 8)}</h5>

                <p className="mb-1">
                  Cliente:{" "}
                  <strong>
                    {sale.customer?.name || "Cliente não informado"}
                  </strong>
                </p>

                <p className="mb-1">
                  WhatsApp:{" "}
                  <strong>{sale.customer?.phone || "Não informado"}</strong>
                </p>

                <p className="mb-1">
                  Total: <strong>{formatMoney(sale.total)}</strong>
                </p>

                <p className="mb-1">
                  Status atual: <strong>{statusLabel(sale.status)}</strong>
                </p>

                {sale.cancelReason && (
                  <p className="text-danger mb-1">
                    Motivo cancelamento: {sale.cancelReason}
                  </p>
                )}
              </div>

              <div style={{ minWidth: 300 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select mb-2"
                  value={sale.status}
                  onChange={(e) =>
                    changeStatus(sale.id, e.target.value as SaleStatus)
                  }
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>

                <label className="form-label">Código de rastreio</label>
                <input
                  className="form-control mb-2"
                  value={tracking[sale.id] ?? sale.trackingCode ?? ""}
                  onChange={(e) =>
                    setTracking({
                      ...tracking,
                      [sale.id]: e.target.value,
                    })
                  }
                  placeholder="Ex: BR123456789BR"
                />

                <button
                  className="btn btn-sm me-2"
                  style={{
                    background: theme.brown,
                    color: "#fff",
                    borderRadius: 999,
                  }}
                  onClick={() => changeStatus(sale.id, sale.status)}
                >
                  Salvar rastreio
                </button>

                {sale.status === "cancelamento_solicitado" && (
                  <button
                    className="btn btn-sm btn-outline-danger"
                    style={{ borderRadius: 999 }}
                    onClick={() => approveCancel(sale.id)}
                  >
                    Aprovar cancelamento
                  </button>
                )}
              </div>
            </div>

            <hr />

            <div className="d-flex flex-wrap gap-2">
              {sale.items.map((item) => (
                <span
                  key={item.id}
                  className="badge"
                  style={{ background: theme.brownSoft }}
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        ))}

        {!sales.length && (
          <div className="alert alert-warning">
            Nenhuma venda registrada ainda.
          </div>
        )}
      </section>
    </main>
  );
}

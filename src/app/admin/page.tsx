"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { getAllSales, getProducts, updateSaleStatus } from "@/lib/firestore";
import { Product, Sale, SaleStatus } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
import { theme } from "@/lib/theme";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ||
  "taisadefante@hotmail.com";

const statuses: SaleStatus[] = [
  "aguardando_pagamento",
  "pago",
  "separando",
  "pronto_envio",
  "pronto_retirada",
  "enviado",
  "entregue",
  "cancelamento_solicitado",
  "cancelado",
];


function calculateProductsTotal(sale: Sale) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateProductsCost(sale: Sale) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number((item as { costPrice?: number }).costPrice || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateShippingRevenue(sale: Sale) {
  const data = sale as Sale & { deliveryPrice?: number; shippingRevenue?: number };
  return Number(data.deliveryPrice || data.shippingRevenue || 0);
}

function calculateShippingCostPaidByStore(sale: Sale) {
  const data = sale as Sale & { shippingCostPaidByStore?: number; shippingCost?: number };
  return Number(data.shippingCostPaidByStore || data.shippingCost || 0);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,00%";
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function formatDate(value?: number | string | null) {
  if (!value) return "Não informado";

  const date =
    typeof value === "number" ? new Date(value) : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Não informado";

  return date.toLocaleString("pt-BR");
}

function AdminContent() {
  const today = new Date();

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);

  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState(String(today.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(today.getFullYear()));

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [logging, setLogging] = useState(false);

  const isAdmin =
    !!adminUser?.email && adminUser.email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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

      setSales(
        [...salesList].sort(
          (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
        ),
      );
    } catch (error) {
      console.error("Erro ao carregar painel admin:", error);
      alert("Erro ao carregar painel admin.");
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

      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLogging(false);
    }
  }

  async function changeSaleStatus(id: string, status: SaleStatus) {
    const previousSales = sales;

    setUpdatingSaleId(id);

    setSales((currentSales) =>
      currentSales.map((sale) =>
        sale.id === id ? { ...sale, status, updatedAt: Date.now() } : sale,
      ),
    );

    try {
      await updateSaleStatus(id, status);
      await load();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setSales(previousSales);
      alert("Erro ao atualizar status da venda.");
    } finally {
      setUpdatingSaleId(null);
    }
  }

  const periodSales = useMemo(() => {
    return sales.filter((sale) => {
      if (!sale.createdAt) return false;

      const date = new Date(sale.createdAt);

      if (Number.isNaN(date.getTime())) return false;

      const saleDay = String(date.getDate());
      const saleMonth = String(date.getMonth() + 1);
      const saleYear = String(date.getFullYear());

      if (filterYear && saleYear !== filterYear) return false;
      if (filterMonth && saleMonth !== filterMonth) return false;
      if (filterDay && saleDay !== filterDay) return false;

      return true;
    });
  }, [sales, filterDay, filterMonth, filterYear]);

  const dashboard = useMemo(() => {
    const validSales = periodSales.filter((sale) => sale.status !== "cancelado");
    const paidSales = periodSales.filter((sale) => sale.status === "pago");
    const pendingSales = periodSales.filter(
      (sale) => sale.status === "aguardando_pagamento",
    );

    const preparingSales = periodSales.filter((sale) =>
      ["separando", "pronto_envio", "pronto_retirada"].includes(sale.status),
    );

    const cancelRequests = periodSales.filter(
      (sale) => sale.status === "cancelamento_solicitado",
    );

    const availableProducts = products.filter(
      (product) => product.status === "disponivel",
    );

    const lowStockProducts = availableProducts.filter(
      (product) => Number(product.stock || 0) <= 1,
    );

    const soldProducts = products.filter(
      (product) => product.status === "vendido",
    );

    const reservedProducts = products.filter(
      (product) => product.status === "reservado",
    );

    const periodRevenue = validSales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const productsRevenue = validSales.reduce(
      (sum, sale) => sum + calculateProductsTotal(sale),
      0,
    );

    const shippingRevenue = validSales.reduce(
      (sum, sale) => sum + calculateShippingRevenue(sale),
      0,
    );

    const productsCost = validSales.reduce(
      (sum, sale) => sum + calculateProductsCost(sale),
      0,
    );

    const shippingCostPaidByStore = validSales.reduce(
      (sum, sale) => sum + calculateShippingCostPaidByStore(sale),
      0,
    );

    const grossProfit = productsRevenue - productsCost;
    const netProfit = grossProfit - shippingCostPaidByStore;
    const grossMargin = productsRevenue > 0 ? (grossProfit / productsRevenue) * 100 : 0;
    const netMargin = productsRevenue > 0 ? (netProfit / productsRevenue) * 100 : 0;

    const paidRevenue = paidSales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const ticket = paidSales.length > 0 ? paidRevenue / paidSales.length : 0;

    return {
      periodSales: periodSales.length,
      paidSales: paidSales.length,
      pendingSales: pendingSales.length,
      preparingSales: preparingSales.length,
      cancelRequests: cancelRequests.length,
      periodRevenue,
      productsRevenue,
      shippingRevenue,
      productsCost,
      shippingCostPaidByStore,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      paidRevenue,
      ticket,
      availableProducts: availableProducts.length,
      soldProducts: soldProducts.length,
      reservedProducts: reservedProducts.length,
      lowStockProducts: lowStockProducts.length,
      totalStock: products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0,
      ),
    };
  }, [periodSales, products]);

  const recentSales = periodSales.slice(0, 5);

  const strategicAlerts = useMemo(() => {
    const alerts: string[] = [];

    if (dashboard.pendingSales > 0) {
      alerts.push(`${dashboard.pendingSales} venda(s) aguardando pagamento.`);
    }

    if (dashboard.preparingSales > 0) {
      alerts.push(`${dashboard.preparingSales} pedido(s) em separação/envio.`);
    }

    if (dashboard.cancelRequests > 0) {
      alerts.push(`${dashboard.cancelRequests} solicitação(ões) de cancelamento.`);
    }

    if (dashboard.lowStockProducts > 0) {
      alerts.push(`${dashboard.lowStockProducts} produto(s) com estoque baixo.`);
    }

    if (dashboard.netProfit < 0 && dashboard.periodSales > 0) {
      alerts.push("Atenção: lucro líquido negativo no período selecionado.");
    }

    if (dashboard.grossMargin > 0 && dashboard.grossMargin < 30) {
      alerts.push("Margem bruta abaixo de 30%. Revise preço de venda e custo.");
    }

    if (!alerts.length) {
      alerts.push("Nenhum alerta crítico no período selecionado.");
    }

    return alerts.slice(0, 4);
  }, [dashboard]);

  const lowStockPreview = products
    .filter(
      (product) =>
        product.status === "disponivel" && Number(product.stock || 0) <= 1,
    )
    .slice(0, 5);

  function clearPeriod() {
    setFilterDay("");
    setFilterMonth("");
    setFilterYear("");
  }

  if (loading) {
    return (
      <main className="container-fluid px-3 px-lg-4 py-5">Carregando...</main>
    );
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
    <main className="container-fluid px-3 px-lg-4 pb-5">
      <div
        className="mb-4 p-4"
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h1 className="fw-bold mb-1">Painel Administrativo</h1>
            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Visão estratégica da loja, vendas, estoque e pendências.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="btn btn-sm"
            style={{
              background: theme.brownDark,
              color: "#fff",
              borderRadius: 999,
              padding: "9px 16px",
            }}
          >
            <RefreshCw size={15} className="me-1" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="mb-4 p-3" style={{
        background: theme.ivory2,
        borderRadius: 24,
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
      }}>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Dia</label>
            <select className="form-select" value={filterDay} onChange={(event) => setFilterDay(event.target.value)}>
              <option value="">Todos os dias</option>
              {Array.from({ length: 31 }).map((_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Mês</label>
            <select className="form-select" value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
              <option value="">Todos os meses</option>
              {[
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
              ].map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Ano</label>
            <select className="form-select" value={filterYear} onChange={(event) => setFilterYear(event.target.value)}>
              <option value="">Todos os anos</option>
              {Array.from({ length: 6 }).map((_, index) => {
                const year = new Date().getFullYear() - index;
                return (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={clearPeriod} style={{ borderRadius: 999 }}>
              Limpar período
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          ["Vendas no período", dashboard.periodSales, <ShoppingBag size={22} key="a" />],
          ["Pagas", dashboard.paidSales, <TrendingUp size={22} key="b" />],
          ["Aguardando pagamento", dashboard.pendingSales, <AlertTriangle size={22} key="c" />],
          ["Em separação/envio", dashboard.preparingSales, <Package size={22} key="d" />],
          ["Faturamento com frete", formatMoney(dashboard.periodRevenue), <TrendingUp size={22} key="e" />],
          ["Venda produtos", formatMoney(dashboard.productsRevenue), <TrendingUp size={22} key="ep" />],
          ["Frete recebido", formatMoney(dashboard.shippingRevenue), <TrendingUp size={22} key="fr" />],
          ["Custo produtos", formatMoney(dashboard.productsCost), <Package size={22} key="cp" />],
          ["Lucro bruto", formatMoney(dashboard.grossProfit), <TrendingUp size={22} key="lb" />],
          ["Lucro líquido", formatMoney(dashboard.netProfit), <TrendingUp size={22} key="ll" />],
          ["Margem bruta", formatPercent(dashboard.grossMargin), <TrendingUp size={22} key="mb" />],
          ["Margem líquida", formatPercent(dashboard.netMargin), <TrendingUp size={22} key="ml" />],
          ["Receita paga", formatMoney(dashboard.paidRevenue), <TrendingUp size={22} key="f" />],
          ["Ticket médio", formatMoney(dashboard.ticket), <ShoppingBag size={22} key="g" />],
          ["Produtos disponíveis", dashboard.availableProducts, <Package size={22} key="h" />],
          ["Estoque total", dashboard.totalStock, <Package size={22} key="i" />],
          ["Estoque baixo", dashboard.lowStockProducts, <AlertTriangle size={22} key="j" />],
          ["Reservados", dashboard.reservedProducts, <Package size={22} key="k" />],
          ["Vendidos", dashboard.soldProducts, <ShoppingBag size={22} key="l" />],
        ].map(([label, value, icon]) => (
          <div className="col-6 col-xl-3" key={String(label)}>
            <div className="p-3 h-100" style={{
              background: theme.ivory2,
              borderRadius: 20,
              boxShadow: theme.shadow,
              border: `1px solid ${theme.border}`,
            }}>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <small style={{ color: theme.brownSoft }}>{label}</small>
                <span style={{ color: theme.brown }}>{icon}</span>
              </div>
              <h4 className="fw-bold mb-0 mt-2">{value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <section className="h-100" style={{
            background: theme.ivory2,
            borderRadius: 24,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
          }}>
            <div className="p-3 border-bottom">
              <h4 className="fw-bold mb-1">Resumo estratégico</h4>
              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Pontos que precisam de atenção.
              </p>
            </div>

            <div className="p-3">
              {strategicAlerts.map((alert) => (
                <div key={alert} className="mb-2 p-3" style={{
                  background: "#fffaf2",
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                }}>
                  <AlertTriangle size={16} className="me-2" />
                  {alert}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section className="h-100" style={{
            background: theme.ivory2,
            borderRadius: 24,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
          }}>
            <div className="p-3 border-bottom">
              <h4 className="fw-bold mb-1">Últimas vendas do período</h4>
              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Pequena visão com status editável.
              </p>
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentSales.map((sale) => {
                    const isUpdating = updatingSaleId === sale.id;

                    return (
                      <tr key={sale.id}>
                        <td>
                          <strong>#{sale.id.slice(0, 8)}</strong>
                          <div style={{ fontSize: 12, color: theme.brownSoft }}>
                            {formatDate(sale.createdAt)}
                          </div>
                        </td>

                        <td style={{ minWidth: 180 }}>
                          <strong>
                            {sale.customer?.name || "Cliente não informado"}
                          </strong>
                        </td>

                        <td>
                          <strong>{formatMoney(sale.total || 0)}</strong>
                        </td>

                        <td style={{ minWidth: 200 }}>
                          <select
                            className="form-select form-select-sm"
                            value={sale.status}
                            disabled={isUpdating}
                            onChange={(event) =>
                              changeSaleStatus(
                                sale.id,
                                event.target.value as SaleStatus,
                              )
                            }
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${theme.border}`,
                              fontWeight: 700,
                              color: theme.brownDark,
                            }}
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}

                  {!recentSales.length && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">
                        Nenhuma venda nesse período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-3">
          <section className="h-100" style={{
            background: theme.ivory2,
            borderRadius: 24,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
          }}>
            <div className="p-3 border-bottom">
              <h4 className="fw-bold mb-1">Estoque baixo</h4>
              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Até 5 produtos críticos.
              </p>
            </div>

            <div className="p-3">
              {lowStockPreview.map((product) => (
                <div key={product.id} className="d-flex align-items-center gap-3 mb-3 p-2" style={{
                  background: "#fffaf2",
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                }}>
                  <img
                    src={product.images?.[0] || ""}
                    alt={product.name}
                    style={{
                      width: 54,
                      height: 64,
                      objectFit: "contain",
                      background: "#f3eadf",
                      borderRadius: 12,
                    }}
                  />

                  <div>
                    <strong>{product.name}</strong>
                    <div style={{ fontSize: 13, color: theme.brownSoft }}>
                      Estoque: {Number(product.stock || 0)}
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {formatMoney(product.price || 0)}
                    </div>
                  </div>
                </div>
              ))}

              {!lowStockPreview.length && (
                <div className="alert alert-success mb-0">
                  Nenhum produto crítico.
                </div>
              )}
            </div>
          </section>
        </div>
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
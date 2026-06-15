"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  DollarSign,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { getAllSales } from "@/lib/firestore";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Sale, SaleStatus } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
import { theme } from "@/lib/theme";

type SaleItemWithCost = Sale["items"][number] & {
  costPrice?: number;
};

type SaleWithCost = Sale & {
  items: SaleItemWithCost[];
  productsRevenue?: number;
  productsCost?: number;
  shippingRevenue?: number;
  shippingCostPaidByStore?: number;
  shippingCost?: number;
  grossProfit?: number;
  netProfit?: number;
};

type DailyBilling = {
  day: number;
  dateLabel: string;
  salesCount: number;
  total: number;
  shippingRevenue: number;
  cost: number;
  grossProfit: number;
  netProfit: number;
  paidTotal: number;
  pendingTotal: number;
};

type MonthlyBilling = {
  month: number;
  monthName: string;
  salesCount: number;
  total: number;
  shippingRevenue: number;
  cost: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  netMargin: number;
  paidTotal: number;
  pendingTotal: number;
  canceledTotal: number;
  daily: DailyBilling[];
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const statusOptions: ("todos" | SaleStatus)[] = [
  "todos",
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

function getSaleDate(sale: SaleWithCost) {
  if (!sale.createdAt) return null;

  const date =
    typeof sale.createdAt === "number"
      ? new Date(sale.createdAt)
      : new Date(String(sale.createdAt));

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,00%";

  return `${value.toFixed(2).replace(".", ",")}%`;
}

function calculateProductsTotal(sale: SaleWithCost) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateProductsCost(sale: SaleWithCost) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number(item.costPrice || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateShippingRevenue(sale: SaleWithCost) {
  return Number(sale.deliveryPrice || sale.shippingRevenue || 0);
}

function calculateShippingCostPaidByStore(sale: SaleWithCost) {
  return Number(sale.shippingCostPaidByStore || sale.shippingCost || 0);
}

function AdminFaturamentoContent() {
  const { adminUser, loadingAdmin, isAdmin } = useAdminAuth();

  const currentYear = new Date().getFullYear();

  const [sales, setSales] = useState<SaleWithCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMonth, setOpenMonth] = useState<number | null>(
    new Date().getMonth() + 1,
  );

  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | SaleStatus>(
    "todos",
  );

  async function load() {
    setLoading(true);

    try {
      const list = (await getAllSales()) as SaleWithCost[];
      setSales(list);
    } catch (error) {
      console.error("Erro ao carregar faturamento:", error);
      alert("Erro ao carregar faturamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminUser && isAdmin) {
      load();
    }
  }, [adminUser, isAdmin]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    sales.forEach((sale) => {
      const date = getSaleDate(sale);
      if (date) years.add(date.getFullYear());
    });

    years.add(currentYear);

    return Array.from(years).sort((a, b) => b - a);
  }, [sales, currentYear]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const date = getSaleDate(sale);

      if (!date) return false;

      const saleYear = String(date.getFullYear());
      const saleMonth = String(date.getMonth() + 1);

      if (yearFilter && saleYear !== yearFilter) return false;
      if (monthFilter && saleMonth !== monthFilter) return false;

      if (statusFilter !== "todos" && sale.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [sales, yearFilter, monthFilter, statusFilter]);

  const billingByMonth = useMemo(() => {
    const months: MonthlyBilling[] = Array.from({ length: 12 }).map(
      (_, index) => ({
        month: index + 1,
        monthName: monthNames[index],
        salesCount: 0,
        total: 0,
        shippingRevenue: 0,
        cost: 0,
        grossProfit: 0,
        netProfit: 0,
        margin: 0,
        netMargin: 0,
        paidTotal: 0,
        pendingTotal: 0,
        canceledTotal: 0,
        daily: [],
      }),
    );

    filteredSales.forEach((sale) => {
      const date = getSaleDate(sale);
      if (!date) return;

      const monthIndex = date.getMonth();
      const day = date.getDate();

      const saleTotal = Number(sale.total || 0);
      const productsTotal = calculateProductsTotal(sale);
      const productsCost = calculateProductsCost(sale);
      const shippingRevenue = calculateShippingRevenue(sale);
      const shippingCostPaidByStore = calculateShippingCostPaidByStore(sale);
      const productsProfit = productsTotal - productsCost;
      const netProfit = productsProfit - shippingCostPaidByStore;

      const monthData = months[monthIndex];

      monthData.salesCount += 1;

      if (sale.status !== "cancelado") {
        monthData.total += saleTotal;
        monthData.shippingRevenue += shippingRevenue;
        monthData.cost += productsCost;
        monthData.grossProfit += productsProfit;
        monthData.netProfit += netProfit;
      } else {
        monthData.canceledTotal += saleTotal;
      }

      if (sale.status === "pago") {
        monthData.paidTotal += saleTotal;
      }

      if (sale.status === "aguardando_pagamento") {
        monthData.pendingTotal += saleTotal;
      }

      let dayData = monthData.daily.find((item) => item.day === day);

      if (!dayData) {
        dayData = {
          day,
          dateLabel: `${String(day).padStart(2, "0")}/${String(
            monthIndex + 1,
          ).padStart(2, "0")}/${date.getFullYear()}`,
          salesCount: 0,
          total: 0,
          shippingRevenue: 0,
          cost: 0,
          grossProfit: 0,
          netProfit: 0,
          paidTotal: 0,
          pendingTotal: 0,
        };

        monthData.daily.push(dayData);
      }

      dayData.salesCount += 1;

      if (sale.status !== "cancelado") {
        dayData.total += saleTotal;
        dayData.shippingRevenue += shippingRevenue;
        dayData.cost += productsCost;
        dayData.grossProfit += productsProfit;
        dayData.netProfit += netProfit;
      }

      if (sale.status === "pago") {
        dayData.paidTotal += saleTotal;
      }

      if (sale.status === "aguardando_pagamento") {
        dayData.pendingTotal += saleTotal;
      }
    });

    return months
      .filter((month) =>
        monthFilter ? month.month === Number(monthFilter) : true,
      )
      .map((month) => ({
        ...month,
        margin:
          month.total > 0 ? (month.grossProfit / Math.max(month.total - month.shippingRevenue, 1)) * 100 : 0,
        netMargin:
          month.total > 0 ? (month.netProfit / Math.max(month.total - month.shippingRevenue, 1)) * 100 : 0,
        daily: month.daily.sort((a, b) => a.day - b.day),
      }));
  }, [filteredSales, monthFilter]);

  const summary = useMemo(() => {
    const validSales = filteredSales.filter(
      (sale) => sale.status !== "cancelado",
    );

    const paidSales = filteredSales.filter((sale) => sale.status === "pago");

    const pendingSales = filteredSales.filter(
      (sale) => sale.status === "aguardando_pagamento",
    );

    const canceledSales = filteredSales.filter(
      (sale) => sale.status === "cancelado",
    );

    const total = validSales.reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

    const productsRevenue = validSales.reduce(
      (sum, sale) => sum + calculateProductsTotal(sale),
      0,
    );

    const productsCost = validSales.reduce(
      (sum, sale) => sum + calculateProductsCost(sale),
      0,
    );

    const shippingRevenue = validSales.reduce(
      (sum, sale) => sum + calculateShippingRevenue(sale),
      0,
    );

    const shippingCostPaidByStore = validSales.reduce(
      (sum, sale) => sum + calculateShippingCostPaidByStore(sale),
      0,
    );

    const profit = productsRevenue - productsCost;
    const netProfit = profit - shippingCostPaidByStore;
    const margin = productsRevenue > 0 ? (profit / productsRevenue) * 100 : 0;
    const netMargin = productsRevenue > 0 ? (netProfit / productsRevenue) * 100 : 0;

    return {
      salesCount: filteredSales.length,
      validSalesCount: validSales.length,
      paidCount: paidSales.length,
      pendingCount: pendingSales.length,
      canceledCount: canceledSales.length,
      total,
      productsRevenue,
      shippingRevenue,
      productsCost,
      shippingCostPaidByStore,
      profit,
      netProfit,
      margin,
      netMargin,
      paidTotal: paidSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
      pendingTotal: pendingSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
      averageTicket: validSales.length > 0 ? total / validSales.length : 0,
    };
  }, [filteredSales]);

  function clearFilters() {
    setYearFilter(String(currentYear));
    setMonthFilter("");
    setStatusFilter("todos");
    setOpenMonth(new Date().getMonth() + 1);
  }

  if (loadingAdmin) {
    return (
      <main className="container-fluid px-3 px-lg-4 pb-5">Carregando...</main>
    );
  }

  if (!adminUser || !isAdmin) {
    return (
      <main className="container-fluid px-3 px-lg-4 pb-5">
        <div className="alert alert-danger">
          Acesso restrito. Entre pelo painel admin.
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
            <h1 className="fw-bold mb-1">Faturamento</h1>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Visão mensal, diária, custo, lucro e margem das vendas.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn btn-sm"
            style={{
              background: theme.brownDark,
              color: "#fff",
              borderRadius: 999,
              padding: "9px 16px",
            }}
          >
            <RefreshCw size={15} className="me-1" />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div
        className="mb-4 p-3"
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Ano</label>

            <select
              className="form-select"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              {availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Mês</label>

            <select
              className="form-select"
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value);
                setOpenMonth(
                  event.target.value ? Number(event.target.value) : null,
                );
              }}
            >
              <option value="">Todos os meses</option>

              {monthNames.map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Status estratégico</label>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "todos" | SaleStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "todos" ? "Todos os status" : statusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-outline-secondary w-100"
              style={{ borderRadius: 999 }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {[
          ["Faturamento total", formatMoney(summary.total), <DollarSign size={22} />],
          ["Recebido", formatMoney(summary.paidTotal), <TrendingUp size={22} />],
          ["A receber", formatMoney(summary.pendingTotal), <CalendarDays size={22} />],
          ["Venda produtos", formatMoney(summary.productsRevenue), <DollarSign size={22} />],
          ["Frete recebido", formatMoney(summary.shippingRevenue), <DollarSign size={22} />],
          ["Custo produtos", formatMoney(summary.productsCost), <ShoppingBag size={22} />],
          ["Lucro bruto", formatMoney(summary.profit), <TrendingUp size={22} />],
          ["Lucro líquido", formatMoney(summary.netProfit), <TrendingUp size={22} />],
          ["Margem bruta", formatPercent(summary.margin), <TrendingUp size={22} />],
          ["Margem líquida", formatPercent(summary.netMargin), <TrendingUp size={22} />],
          ["Ticket médio", formatMoney(summary.averageTicket), <ShoppingBag size={22} />],
          ["Vendas válidas", summary.validSalesCount, <ShoppingBag size={22} />],
          ["Pagas", summary.paidCount, <TrendingUp size={22} />],
          ["Pendentes", summary.pendingCount, <CalendarDays size={22} />],
          ["Canceladas", summary.canceledCount, <ShoppingBag size={22} />],
        ].map(([label, value, icon]) => (
          <div className="col-6 col-xl-3" key={String(label)}>
            <div
              className="p-3 h-100"
              style={{
                background: theme.ivory2,
                borderRadius: 20,
                boxShadow: theme.shadow,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-center gap-2">
                <small style={{ color: theme.brownSoft }}>{label}</small>
                <span style={{ color: theme.brown }}>{icon}</span>
              </div>

              <h4 className="fw-bold mb-0 mt-2">{value}</h4>
            </div>
          </div>
        ))}
      </div>

      <section
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
        }}
      >
        <div className="p-3 border-bottom">
          <h4 className="fw-bold mb-1">Faturamento por mês</h4>

          <p className="mb-0" style={{ color: theme.brownSoft }}>
            Clique na seta do mês para abrir as somas diárias.
          </p>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Vendas</th>
                <th>Total com frete</th>
                <th>Frete</th>
                <th>Custo</th>
                <th>Lucro bruto</th>
                <th>Lucro líquido</th>
                <th>Margem</th>
                <th>Recebido</th>
                <th>A receber</th>
                <th>Cancelado</th>
                <th style={{ width: 90, textAlign: "center" }}>Dias</th>
              </tr>
            </thead>

            <tbody>
              {billingByMonth.map((month) => {
                const isOpen = openMonth === month.month;

                return (
                  <Fragment key={month.month}>
                    <tr>
                      <td>
                        <strong>{month.monthName}</strong>
                      </td>

                      <td>{month.salesCount}</td>

                      <td>
                        <strong>{formatMoney(month.total)}</strong>
                      </td>

                      <td>{formatMoney(month.shippingRevenue)}</td>

                      <td>{formatMoney(month.cost)}</td>

                      <td>
                        <strong
                          style={{
                            color: month.grossProfit >= 0 ? "#198754" : "#dc3545",
                          }}
                        >
                          {formatMoney(month.grossProfit)}
                        </strong>
                      </td>

                      <td>
                        <strong style={{ color: month.netProfit >= 0 ? "#198754" : "#dc3545" }}>
                          {formatMoney(month.netProfit)}
                        </strong>
                      </td>

                      <td>{formatPercent(month.margin)}</td>

                      <td>{formatMoney(month.paidTotal)}</td>

                      <td>{formatMoney(month.pendingTotal)}</td>

                      <td>{formatMoney(month.canceledTotal)}</td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            setOpenMonth(isOpen ? null : month.month)
                          }
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            padding: 0,
                          }}
                        >
                          {isOpen ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={11} style={{ background: "#fffaf2" }}>
                          <div className="p-3">
                            <h6 className="fw-bold mb-3">
                              Somas diárias de {month.monthName}
                            </h6>

                            {month.daily.length > 0 ? (
                              <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                  <thead>
                                    <tr>
                                      <th>Dia</th>
                                      <th>Vendas</th>
                                      <th>Total com frete</th>
                                      <th>Frete</th>
                                      <th>Custo</th>
                                      <th>Lucro bruto</th>
                                      <th>Lucro líquido</th>
                                      <th>Recebido</th>
                                      <th>A receber</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {month.daily.map((day) => (
                                      <tr key={`${month.month}-${day.day}`}>
                                        <td>{day.dateLabel}</td>
                                        <td>{day.salesCount}</td>
                                        <td>
                                          <strong>{formatMoney(day.total)}</strong>
                                        </td>
                                        <td>{formatMoney(day.shippingRevenue)}</td>
                                        <td>{formatMoney(day.cost)}</td>
                                        <td>
                                          <strong
                                            style={{
                                              color:
                                                day.grossProfit >= 0
                                                  ? "#198754"
                                                  : "#dc3545",
                                            }}
                                          >
                                            {formatMoney(day.grossProfit)}
                                          </strong>
                                        </td>
                                        <td>
                                          <strong style={{ color: day.netProfit >= 0 ? "#198754" : "#dc3545" }}>
                                            {formatMoney(day.netProfit)}
                                          </strong>
                                        </td>
                                        <td>{formatMoney(day.paidTotal)}</td>
                                        <td>{formatMoney(day.pendingTotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="alert alert-warning mb-0">
                                Nenhuma venda encontrada neste mês.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default function AdminFaturamentoPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <AdminFaturamentoContent />
    </Suspense>
  );
}
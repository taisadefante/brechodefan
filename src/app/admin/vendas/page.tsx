"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Printer,
  RefreshCw,
  Tag,
  X,
} from "lucide-react";

import {
  approveCancelSale,
  getAllSales,
  receiveReturnedSaleProducts,
  updateSaleReverseShippingLabel,
  updateSaleShippingLabel,
  updateSaleStatus,
} from "@/lib/firestore";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { CustomerData, Sale, SaleStatus } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
import { theme } from "@/lib/theme";

type CustomerWithDocument = CustomerData & {
  document?: string;
  cpf?: string;
  cnpj?: string;
};

type SaleItemWithCost = Sale["items"][number] & {
  costPrice?: number;
};

type SaleWithDocument = Sale & {
  customer: CustomerWithDocument;
  items: SaleItemWithCost[];
  productsRevenue?: number;
  productsCost?: number;
  shippingRevenue?: number;
  shippingCostPaidByStore?: number;
  shippingCost?: number;
  grossProfit?: number;
  netProfit?: number;
  melhorEnvioReverseOrderId?: string;
  melhorEnvioReverseCode?: string;
  melhorEnvioReversePrintUrl?: string;
  melhorEnvioReverseCreatedAt?: number;
  returnReceivedAt?: number;
  returnInstructions?: string;
};

type ApiResponseData = {
  error?: string;
  message?: string;
  details?: unknown;
  orderId?: string;
  printUrl?: string;
  reverseCode?: string;
  reversePrintUrl?: string;
};

const statuses: SaleStatus[] = [
  "aguardando_pagamento",
  "pago",
  "separando",
  "pronto_envio",
  "pronto_retirada",
  "enviado",
  "entregue",
  "cancelamento_solicitado",
  "aguardando_retorno" as SaleStatus,
  "cancelado",
];

function onlyNumbers(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,00%";
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function calculateSaleCost(sale: SaleWithDocument) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number(item.costPrice || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateSaleProductsTotal(sale: SaleWithDocument) {
  return (sale.items || []).reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 1);
  }, 0);
}

function calculateSaleShippingRevenue(sale: SaleWithDocument) {
  return Number(sale.deliveryPrice || sale.shippingRevenue || 0);
}

function calculateSaleShippingCostPaidByStore(sale: SaleWithDocument) {
  return Number(sale.shippingCostPaidByStore || sale.shippingCost || 0);
}

function calculateSaleProfit(sale: SaleWithDocument) {
  return calculateSaleProductsTotal(sale) - calculateSaleCost(sale);
}

function calculateSaleNetProfit(sale: SaleWithDocument) {
  return calculateSaleProfit(sale) - calculateSaleShippingCostPaidByStore(sale);
}

function calculateSaleMargin(sale: SaleWithDocument) {
  const productsTotal = calculateSaleProductsTotal(sale);
  const profit = calculateSaleProfit(sale);

  if (productsTotal <= 0) return 0;

  return (profit / productsTotal) * 100;
}

function isValidCpf(value?: string) {
  const cpf = onlyNumbers(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;

  if (digit !== Number(cpf[9])) return false;

  sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }

  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;

  return digit === Number(cpf[10]);
}

function isValidCnpj(value?: string) {
  const cnpj = onlyNumbers(value);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const sum = factors.reduce(
      (acc, factor, index) => acc + Number(base[index]) * factor,
      0,
    );

    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digit1 === Number(cnpj[12]) && digit2 === Number(cnpj[13]);
}

function isValidCpfOrCnpj(value?: string) {
  const clean = onlyNumbers(value);

  if (clean.length === 11) return isValidCpf(clean);
  if (clean.length === 14) return isValidCnpj(clean);

  return false;
}

function formatCpfCnpj(value?: string) {
  const clean = onlyNumbers(value);

  if (clean.length === 11) {
    return clean
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  if (clean.length === 14) {
    return clean
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return clean || "Não informado";
}

function getCustomerDocument(customer?: CustomerWithDocument | null) {
  return onlyNumbers(customer?.document || customer?.cpf || customer?.cnpj || "");
}

function deliveryTypeLabel(type?: string) {
  if (type === "envio") return "Envio";
  if (type === "retirada") return "Retirada";
  if (type === "combinar_whatsapp") return "Uber/99";

  return type || "Não informado";
}

function formatDate(value?: number | string | null) {
  if (!value) return "Não informado";

  const date =
    typeof value === "number" ? new Date(value) : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Não informado";

  return date.toLocaleString("pt-BR");
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  return String(value);
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <small style={{ color: theme.brownSoft }}>{label}</small>
      <p className="fw-bold mb-0">{value || "Não informado"}</p>
    </div>
  );
}

function AdminVendasContent() {
  const { adminUser, loadingAdmin, isAdmin } = useAdminAuth();

  const [sales, setSales] = useState<SaleWithDocument[]>([]);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [saleToGenerateLabel, setSaleToGenerateLabel] =
    useState<SaleWithDocument | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState<Record<string, boolean>>(
    {},
  );
  const [generatingReverse, setGeneratingReverse] = useState<
    Record<string, boolean>
  >({});
  const [receivingReturn, setReceivingReturn] = useState<Record<string, boolean>>(
    {},
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | SaleStatus>(
    "todos",
  );
  const [deliveryFilter, setDeliveryFilter] = useState("todos");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const customerDocument = getCustomerDocument(sale.customer);

      const searchText = [
        sale.id,
        sale.customer?.name,
        sale.customer?.email,
        sale.customer?.phone,
        customerDocument,
        sale.status,
        sale.deliveryType,
        sale.mercadoPagoPreferenceId,
      ]
        .join(" ")
        .toLowerCase();

      if (search.trim() && !searchText.includes(search.trim().toLowerCase())) {
        return false;
      }

      if (statusFilter !== "todos" && sale.status !== statusFilter) {
        return false;
      }

      if (deliveryFilter !== "todos" && sale.deliveryType !== deliveryFilter) {
        return false;
      }

      const saleDate = sale.createdAt ? new Date(sale.createdAt).getTime() : 0;

      if (dateStart) {
        const start = new Date(`${dateStart}T00:00:00`).getTime();
        if (saleDate < start) return false;
      }

      if (dateEnd) {
        const end = new Date(`${dateEnd}T23:59:59`).getTime();
        if (saleDate > end) return false;
      }

      if (minValue && Number(sale.total || 0) < Number(minValue)) {
        return false;
      }

      if (maxValue && Number(sale.total || 0) > Number(maxValue)) {
        return false;
      }

      return true;
    });
  }, [
    sales,
    search,
    statusFilter,
    deliveryFilter,
    dateStart,
    dateEnd,
    minValue,
    maxValue,
  ]);

  const totals = useMemo(() => {
    const validSales = filteredSales.filter((sale) => sale.status !== "cancelado");

    const productsRevenue = validSales.reduce(
      (sum, sale) => sum + calculateSaleProductsTotal(sale),
      0,
    );

    const productsCost = validSales.reduce(
      (sum, sale) => sum + calculateSaleCost(sale),
      0,
    );

    const shippingRevenue = validSales.reduce(
      (sum, sale) => sum + calculateSaleShippingRevenue(sale),
      0,
    );

    const shippingCostPaidByStore = validSales.reduce(
      (sum, sale) => sum + calculateSaleShippingCostPaidByStore(sale),
      0,
    );

    const profit = productsRevenue - productsCost;
    const netProfit = profit - shippingCostPaidByStore;
    const margin = productsRevenue > 0 ? (profit / productsRevenue) * 100 : 0;
    const netMargin = productsRevenue > 0 ? (netProfit / productsRevenue) * 100 : 0;

    return {
      quantity: filteredSales.length,
      paid: filteredSales.filter((sale) => sale.status === "pago").length,
      pending: filteredSales.filter(
        (sale) => sale.status === "aguardando_pagamento",
      ).length,
      revenue: validSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
      productsRevenue,
      shippingRevenue,
      productsCost,
      shippingCostPaidByStore,
      profit,
      netProfit,
      margin,
      netMargin,
    };
  }, [filteredSales]);

  async function load() {
    try {
      const list = (await getAllSales()) as SaleWithDocument[];

      const sorted = [...list].sort(
        (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0),
      );

      setSales(sorted);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      alert("Erro ao carregar vendas.");
    }
  }

  useEffect(() => {
    if (adminUser && isAdmin) {
      load();
    }
  }, [adminUser, isAdmin]);

  async function changeStatus(id: string, status: SaleStatus) {
    const previousSales = sales;

    setUpdatingSaleId(id);

    setSales((currentSales) =>
      currentSales.map((sale) =>
        sale.id === id
          ? {
              ...sale,
              status,
              trackingCode: tracking[id] ?? sale.trackingCode ?? "",
              updatedAt: Date.now(),
            }
          : sale,
      ),
    );

    try {
      await updateSaleStatus(id, status, tracking[id]);
      await load();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setSales(previousSales);
      alert("Erro ao atualizar status da venda.");
    } finally {
      setUpdatingSaleId(null);
    }
  }

  async function approveCancel(id: string) {
    if (!confirm("Aprovar cancelamento e liberar produtos?")) return;

    setUpdatingSaleId(id);

    try {
      await approveCancelSale(id);
      await load();
    } catch (error) {
      console.error("Erro ao aprovar cancelamento:", error);
      alert("Erro ao aprovar cancelamento.");
    } finally {
      setUpdatingSaleId(null);
    }
  }

  async function readApiResponse(response: Response): Promise<ApiResponseData> {
    const rawText = await response.text();

    try {
      return rawText ? JSON.parse(rawText) : {};
    } catch {
      return {
        error: rawText || "A API retornou uma resposta inválida.",
      };
    }
  }

  function showApiError(data: ApiResponseData, fallback: string) {
    alert(
      `${data?.error || fallback}\n\nDetalhes:\n${JSON.stringify(
        data?.details || data,
        null,
        2,
      )}`,
    );
  }

  function getCustomerForLabel(sale: SaleWithDocument): CustomerWithDocument {
    const document = getCustomerDocument(sale.customer);

    return {
      ...sale.customer,
      document,
    };
  }

  function validateLabelData(sale: SaleWithDocument) {
    const customer = getCustomerForLabel(sale);
    const document = getCustomerDocument(customer);

    if (!sale.shippingOption) {
      alert("Essa venda não tem frete escolhido salvo.");
      return null;
    }

    if (!document) {
      alert("CPF/CNPJ não encontrado nesta venda.");
      return null;
    }

    if (!isValidCpfOrCnpj(document)) {
      alert("CPF/CNPJ inválido para gerar etiqueta.");
      return null;
    }

    if (!customer.cep || !customer.address || !customer.number) {
      alert("Dados do cliente incompletos para etiqueta.");
      return null;
    }

    return customer;
  }

  function canGenerateReverseLabel(sale: SaleWithDocument) {
    const status = String(sale.status || "");

    return (
      sale.deliveryType === "envio" &&
      Boolean(sale.shippingOption) &&
      Boolean(sale.melhorEnvioOrderId || sale.melhorEnvioPrintUrl) &&
      !sale.melhorEnvioReverseOrderId &&
      ["enviado", "entregue", "cancelamento_solicitado"].includes(status)
    );
  }

  function getReverseInstructions(sale: SaleWithDocument, data: ApiResponseData) {
    const code = data.reverseCode || "código informado pelo Melhor Envio";

    return [
      "Sua devolução foi aprovada.",
      `Código de logística reversa: ${code}.`,
      "Leve o produto bem embalado até uma agência/ponto autorizado informado pela transportadora.",
      "Apresente o código no balcão. Se houver link/PDF disponível, imprima e cole a etiqueta na embalagem.",
      "Guarde o comprovante de postagem.",
      "O produto só volta ao estoque e o processo é finalizado após a loja receber e conferir a peça.",
      `Pedido: #${sale.id.slice(0, 8)}.`,
    ].join("\n");
  }

  async function simulateLabel(sale: SaleWithDocument) {
    const customerForLabel = validateLabelData(sale);
    if (!customerForLabel) return;

    setGeneratingLabel((prev) => ({ ...prev, [sale.id]: true }));

    try {
      const response = await fetch("/api/melhor-envio/etiqueta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "simulate",
          saleId: sale.id,
          customer: customerForLabel,
          items: sale.items,
          shippingOption: sale.shippingOption,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        console.error("Erro simulação etiqueta:", data);
        showApiError(data, "Erro ao simular etiqueta.");
        return;
      }

      alert(data.message || "Simulação concluída com sucesso.");
    } catch (error) {
      console.error("Erro ao simular etiqueta:", error);
      alert("Erro ao simular etiqueta.");
    } finally {
      setGeneratingLabel((prev) => ({ ...prev, [sale.id]: false }));
    }
  }

  function openGenerateLabelModal(sale: SaleWithDocument) {
    if (sale.status !== "pronto_envio") {
      alert("Altere o status para Pronto para envio antes de gerar etiqueta.");
      return;
    }

    if (sale.melhorEnvioOrderId || sale.melhorEnvioPrintUrl) {
      alert("Essa venda já possui etiqueta gerada.");
      return;
    }

    const customerForLabel = validateLabelData(sale);
    if (!customerForLabel) return;

    setSaleToGenerateLabel(sale);
  }

  async function confirmGenerateLabel() {
    if (!saleToGenerateLabel) return;

    const sale = saleToGenerateLabel;
    const customerForLabel = validateLabelData(sale);

    if (!customerForLabel) return;

    setGeneratingLabel((prev) => ({ ...prev, [sale.id]: true }));

    try {
      const response = await fetch("/api/melhor-envio/etiqueta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          saleId: sale.id,
          customer: customerForLabel,
          items: sale.items,
          shippingOption: sale.shippingOption,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        console.error("Erro etiqueta:", data);
        showApiError(data, "Erro ao gerar etiqueta.");
        return;
      }

      await updateSaleShippingLabel(sale.id, {
        melhorEnvioOrderId: data.orderId || "",
        melhorEnvioPrintUrl: data.printUrl || "",
        trackingCode: sale.trackingCode || "",
      });

      setSaleToGenerateLabel(null);
      await load();

      if (data.printUrl) {
        window.open(data.printUrl, "_blank");
      } else {
        alert("Etiqueta gerada, mas o link de impressão não retornou.");
      }
    } catch (error) {
      console.error("Erro ao gerar etiqueta:", error);
      alert("Erro ao gerar etiqueta.");
    } finally {
      setGeneratingLabel((prev) => ({ ...prev, [sale.id]: false }));
    }
  }


  async function generateReverseLabel(sale: SaleWithDocument) {
    if (!canGenerateReverseLabel(sale)) {
      alert(
        "A reversa só deve ser gerada para pedido enviado/entregue ou com cancelamento solicitado, com etiqueta de envio já gerada.",
      );
      return;
    }

    const customerForLabel = validateLabelData(sale);
    if (!customerForLabel) return;

    const confirmReverse = confirm(
      "Gerar logística reversa para este pedido? Essa ação pode comprar a reversa no Melhor Envio.",
    );

    if (!confirmReverse) return;

    setGeneratingReverse((prev) => ({ ...prev, [sale.id]: true }));

    try {
      const response = await fetch("/api/melhor-envio/reversa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          saleId: sale.id,
          customer: customerForLabel,
          items: sale.items,
          shippingOption: sale.shippingOption,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        console.error("Erro reversa:", data);
        showApiError(data, "Erro ao gerar logística reversa.");
        return;
      }

      await updateSaleReverseShippingLabel(sale.id, {
        melhorEnvioReverseOrderId: data.orderId || "",
        melhorEnvioReverseCode: data.reverseCode || "",
        melhorEnvioReversePrintUrl:
          data.reversePrintUrl || data.printUrl || "",
        melhorEnvioReverseCreatedAt: Date.now(),
        returnInstructions: getReverseInstructions(sale, data),
      });

      await changeStatus(sale.id, "aguardando_retorno" as SaleStatus);
      await load();

      if (data.reversePrintUrl || data.printUrl) {
        window.open(data.reversePrintUrl || data.printUrl, "_blank");
      }

      alert(
        "Logística reversa gerada. O andamento e o código aparecerão na página Minha Conta do cliente.",
      );
    } catch (error) {
      console.error("Erro ao gerar reversa:", error);
      alert("Erro ao gerar logística reversa.");
    } finally {
      setGeneratingReverse((prev) => ({ ...prev, [sale.id]: false }));
    }
  }

  async function receiveReturnedProducts(sale: SaleWithDocument) {
    const confirmReceive = confirm(
      "Confirmar que o produto retornou para a loja e liberar estoque?",
    );

    if (!confirmReceive) return;

    setReceivingReturn((prev) => ({ ...prev, [sale.id]: true }));

    try {
      await receiveReturnedSaleProducts(sale.id);
      await load();
      alert("Produto recebido, estoque liberado e venda cancelada.");
    } catch (error) {
      console.error("Erro ao receber devolução:", error);
      alert("Erro ao receber devolução.");
    } finally {
      setReceivingReturn((prev) => ({ ...prev, [sale.id]: false }));
    }
  }

  function printSale(saleId: string) {
    const content = document.getElementById(`sale-print-${saleId}`);
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido ${saleId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #3b2418; }
            .product { display: flex; gap: 12px; border-bottom: 1px solid #eee; padding: 10px 0; }
            .product img { width: 70px; height: 85px; object-fit: contain; background: #f3eadf; border-radius: 8px; }
            small { color: #7a5c4c; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("todos");
    setDeliveryFilter("todos");
    setDateStart("");
    setDateEnd("");
    setMinValue("");
    setMaxValue("");
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
      {saleToGenerateLabel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fffaf2",
              borderRadius: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              border: `1px solid ${theme.border}`,
              padding: 24,
            }}
          >
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h4 className="fw-bold mb-1">Confirmar geração de etiqueta</h4>
                <p className="mb-0" style={{ color: theme.brownSoft }}>
                  Essa ação pode comprar a etiqueta no Melhor Envio.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  padding: 0,
                }}
                onClick={() => setSaleToGenerateLabel(null)}
                disabled={Boolean(generatingLabel[saleToGenerateLabel.id])}
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="p-3 mb-3"
              style={{
                background: "#fff",
                borderRadius: 18,
                border: `1px solid ${theme.border}`,
              }}
            >
              <p className="mb-1">
                <strong>Pedido:</strong> #{saleToGenerateLabel.id.slice(0, 8)}
              </p>

              <p className="mb-1">
                <strong>Cliente:</strong>{" "}
                {saleToGenerateLabel.customer?.name || "Não informado"}
              </p>

              <p className="mb-1">
                <strong>Frete:</strong>{" "}
                {saleToGenerateLabel.shippingOption?.company || "Não informado"}{" "}
                - {saleToGenerateLabel.shippingOption?.name || "Não informado"}
              </p>

              <p className="mb-0">
                <strong>Valor do frete:</strong>{" "}
                {formatMoney(saleToGenerateLabel.deliveryPrice || 0)}
              </p>
            </div>

            <div className="alert alert-warning py-2">
              Confira se o pedido está realmente pronto para envio.
            </div>

            <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                style={{ borderRadius: 999 }}
                onClick={() => setSaleToGenerateLabel(null)}
                disabled={Boolean(generatingLabel[saleToGenerateLabel.id])}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn"
                style={{
                  background: theme.brownDark,
                  color: "#fff",
                  borderRadius: 999,
                }}
                onClick={confirmGenerateLabel}
                disabled={Boolean(generatingLabel[saleToGenerateLabel.id])}
              >
                {generatingLabel[saleToGenerateLabel.id]
                  ? "Gerando etiqueta..."
                  : "Confirmar e gerar etiqueta"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h1 className="fw-bold mb-1">Vendas</h1>
            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Acompanhe pedidos, faturamento, custo, lucro e margem.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="btn btn-sm"
            disabled={Boolean(updatingSaleId)}
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

      <div className="row g-3 mb-4">
        {[
          ["Vendas filtradas", totals.quantity],
          ["Pagas", totals.paid],
          ["Aguardando pagamento", totals.pending],
          ["Total com frete", formatMoney(totals.revenue)],
          ["Venda produtos", formatMoney(totals.productsRevenue)],
          ["Frete recebido", formatMoney(totals.shippingRevenue)],
          ["Custo produtos", formatMoney(totals.productsCost)],
          ["Lucro bruto", formatMoney(totals.profit)],
          ["Lucro líquido", formatMoney(totals.netProfit)],
          ["Margem bruta", formatPercent(totals.margin)],
          ["Margem líquida", formatPercent(totals.netMargin)],
        ].map(([label, value]) => (
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
              <small style={{ color: theme.brownSoft }}>{label}</small>
              <h4 className="fw-bold mb-0">{value}</h4>
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
          <h2 className="fw-bold mb-1">Vendas registradas</h2>
          <p className="mb-0" style={{ color: theme.brownSoft }}>
            Use os filtros para localizar pedidos rapidamente.
          </p>
        </div>

        <div className="p-3 border-bottom" style={{ background: "#fffaf2" }}>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-xl-3">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Pedido, cliente, e-mail, telefone ou CPF"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "todos" | SaleStatus)
                }
              >
                <option value="todos">Todos</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <label className="form-label">Entrega</label>
              <select
                className="form-select"
                value={deliveryFilter}
                onChange={(event) => setDeliveryFilter(event.target.value)}
              >
                <option value="todos">Todas</option>
                <option value="envio">Envio</option>
                <option value="retirada">Retirada</option>
                <option value="combinar_whatsapp">Uber/99</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <label className="form-label">Data inicial</label>
              <input
                type="date"
                className="form-control"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <label className="form-label">Data final</label>
              <input
                type="date"
                className="form-control"
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-4 col-xl-1">
              <label className="form-label">Mín.</label>
              <input
                type="number"
                className="form-control"
                value={minValue}
                onChange={(event) => setMinValue(event.target.value)}
              />
            </div>

            <div className="col-6 col-md-4 col-xl-1">
              <label className="form-label">Máx.</label>
              <input
                type="number"
                className="form-control"
                value={maxValue}
                onChange={(event) => setMaxValue(event.target.value)}
              />
            </div>

            <div className="col-12 col-xl-1">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={clearFilters}
                style={{ borderRadius: 999 }}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Entrega</th>
                <th>Total</th>
                <th>Lucro</th>
                <th>Margem</th>
                <th>Status</th>
                <th style={{ width: 90, textAlign: "center" }}>Detalhes</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => {
                const isOpen = openSaleId === sale.id;
                const shippingAddress = sale.shippingAddress || null;
                const customerDocument = getCustomerDocument(sale.customer);
                const isUpdatingThisSale = updatingSaleId === sale.id;

                const productsTotal = calculateSaleProductsTotal(sale);
                const productsCost = calculateSaleCost(sale);
                const profit = calculateSaleProfit(sale);
                const margin = calculateSaleMargin(sale);

                const canBuyLabel =
                  sale.status === "pronto_envio" &&
                  !sale.melhorEnvioOrderId &&
                  !sale.melhorEnvioPrintUrl;

                const canGenerateReverse = canGenerateReverseLabel(sale);
                const hasReverse =
                  Boolean(sale.melhorEnvioReverseOrderId) ||
                  Boolean(sale.melhorEnvioReverseCode) ||
                  Boolean(sale.melhorEnvioReversePrintUrl);
                const canReceiveReturn =
                  hasReverse &&
                  !sale.returnReceivedAt &&
                  String(sale.status) === "aguardando_retorno";

                return (
                  <Fragment key={sale.id}>
                    <tr>
                      <td>
                        <strong>#{sale.id.slice(0, 8)}</strong>
                        <div style={{ fontSize: 12, color: theme.brownSoft }}>
                          {sale.mercadoPagoPreferenceId
                            ? `MP: ${sale.mercadoPagoPreferenceId}`
                            : "Sem preferência MP"}
                        </div>
                      </td>

                      <td style={{ minWidth: 150 }}>
                        {formatDate(sale.createdAt)}
                      </td>

                      <td style={{ minWidth: 220 }}>
                        <strong>
                          {sale.customer?.name || "Cliente não informado"}
                        </strong>
                        <div style={{ fontSize: 12, color: theme.brownSoft }}>
                          {sale.customer?.email || "E-mail não informado"}
                        </div>
                        <div style={{ fontSize: 12, color: theme.brownSoft }}>
                          {sale.customer?.phone || "Telefone não informado"}
                        </div>
                      </td>

                      <td>
                        <strong>{sale.items?.length || 0}</strong>
                      </td>

                      <td>{deliveryTypeLabel(sale.deliveryType)}</td>

                      <td>
                        <strong>{formatMoney(sale.total || 0)}</strong>
                        <div style={{ fontSize: 12, color: theme.brownSoft }}>
                          Produtos: {formatMoney(productsTotal)}
                        </div>
                      </td>

                      <td>
                        <strong
                          style={{
                            color: profit >= 0 ? "#198754" : "#dc3545",
                          }}
                        >
                          {formatMoney(profit)}
                        </strong>
                        <div style={{ fontSize: 12, color: theme.brownSoft }}>
                          Custo: {formatMoney(productsCost)}
                        </div>
                      </td>

                      <td>
                        <span
                          className="badge"
                          style={{
                            background: margin >= 50 ? "#d1e7dd" : "#fff3cd",
                            color: margin >= 50 ? "#0f5132" : "#664d03",
                            borderRadius: 999,
                            padding: "7px 10px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatPercent(margin)}
                        </span>
                      </td>

                      <td style={{ minWidth: 220 }}>
                        <select
                          className="form-select form-select-sm"
                          value={sale.status}
                          disabled={isUpdatingThisSale}
                          onChange={(event) =>
                            changeStatus(
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

                        {isUpdatingThisSale && (
                          <small style={{ color: theme.brownSoft }}>
                            Salvando...
                          </small>
                        )}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() =>
                            setOpenSaleId(isOpen ? null : sale.id)
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
                      <tr key={`${sale.id}-details`}>
                        <td colSpan={10} style={{ background: "#fffaf2" }}>
                          <div id={`sale-print-${sale.id}`} style={{ padding: 18 }}>
                            <div className="row g-3 mb-3">
                              <InfoItem label="ID completo do pedido" value={`#${sale.id}`} />
                              <InfoItem label="ID do usuário" value={text(sale.userId)} />
                              <InfoItem label="Status" value={statusLabel(sale.status)} />
                              <InfoItem label="Criado em" value={formatDate(sale.createdAt)} />
                              <InfoItem label="Atualizado em" value={formatDate(sale.updatedAt)} />
                              <InfoItem label="Tipo de entrega" value={deliveryTypeLabel(sale.deliveryType)} />
                              <InfoItem label="Nome" value={text(sale.customer?.name)} />
                              <InfoItem
                                label="CPF/CNPJ"
                                value={
                                  customerDocument
                                    ? formatCpfCnpj(customerDocument)
                                    : "Não informado"
                                }
                              />
                              <InfoItem label="E-mail" value={text(sale.customer?.email)} />
                              <InfoItem label="Telefone/WhatsApp" value={text(sale.customer?.phone)} />
                              <InfoItem label="CEP" value={text(sale.customer?.cep)} />
                              <InfoItem label="Rua/Avenida" value={text(sale.customer?.address)} />
                              <InfoItem label="Número" value={text(sale.customer?.number)} />
                              <InfoItem label="Complemento" value={text(sale.customer?.complement)} />
                              <InfoItem label="Bairro" value={text(sale.customer?.district)} />
                              <InfoItem label="Cidade" value={text(sale.customer?.city)} />
                              <InfoItem label="Estado" value={text(sale.customer?.state)} />
                              <InfoItem
                                label="Endereço salvo"
                                value={
                                  shippingAddress
                                    ? `${shippingAddress.address}, ${shippingAddress.number} - ${shippingAddress.city}/${shippingAddress.state}`
                                    : "Não informado"
                                }
                              />
                              <InfoItem label="Transportadora" value={text(sale.shippingOption?.company)} />
                              <InfoItem label="Serviço" value={text(sale.shippingOption?.name)} />
                              <InfoItem label="Valor do frete" value={formatMoney(sale.deliveryPrice || 0)} />
                              <InfoItem label="ID Melhor Envio" value={text(sale.melhorEnvioOrderId)} />
                              <InfoItem label="Código de rastreio" value={text(sale.trackingCode)} />
                            </div>

                            <div
                              className="p-3 mb-3"
                              style={{
                                background: "#fff",
                                borderRadius: 18,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              <h6 className="fw-bold mb-3">
                                Produtos comprados
                              </h6>

                              <div className="d-grid gap-2">
                                {sale.items?.map((item) => {
                                  const quantity = Number(item.quantity || 1);
                                  const itemCost = Number(item.costPrice || 0);
                                  const itemPrice = Number(item.price || 0);
                                  const itemProfit =
                                    (itemPrice - itemCost) * quantity;
                                  const itemMargin =
                                    itemPrice > 0
                                      ? ((itemPrice - itemCost) / itemPrice) * 100
                                      : 0;

                                  return (
                                    <div
                                      key={item.id}
                                      className="d-flex flex-wrap align-items-center gap-3 p-2"
                                      style={{
                                        background: "#fffaf2",
                                        borderRadius: 16,
                                        border: `1px solid ${theme.border}`,
                                      }}
                                    >
                                      <img
                                        src={item.images?.[0] || ""}
                                        alt={item.name}
                                        style={{
                                          width: 70,
                                          height: 85,
                                          objectFit: "contain",
                                          background: "#f3eadf",
                                          borderRadius: 12,
                                        }}
                                      />

                                      <div className="flex-grow-1">
                                        <strong>{item.name}</strong>

                                        <div
                                          style={{
                                            fontSize: 13,
                                            color: theme.brownSoft,
                                          }}
                                        >
                                          {[item.category, item.size, item.color]
                                            .filter(Boolean)
                                            .join(" • ")}
                                        </div>

                                        <div style={{ fontSize: 13 }}>
                                          Quantidade: {quantity}
                                        </div>

                                        <div style={{ fontSize: 13 }}>
                                          Custo unitário: {formatMoney(itemCost)}
                                        </div>

                                        <div style={{ fontSize: 13 }}>
                                          Venda unitária: {formatMoney(itemPrice)}
                                        </div>

                                        <div style={{ fontSize: 13 }}>
                                          Lucro:{" "}
                                          <strong
                                            style={{
                                              color:
                                                itemProfit >= 0
                                                  ? "#198754"
                                                  : "#dc3545",
                                            }}
                                          >
                                            {formatMoney(itemProfit)}
                                          </strong>{" "}
                                          • Margem: {formatPercent(itemMargin)}
                                        </div>
                                      </div>

                                      <strong>
                                        {formatMoney(itemPrice * quantity)}
                                      </strong>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div
                              className="p-3 mb-3"
                              style={{
                                background: "#fff",
                                borderRadius: 18,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              <h6 className="fw-bold mb-3">
                                Resumo financeiro
                              </h6>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Subtotal dos produtos</span>
                                <strong>{formatMoney(sale.subtotal || 0)}</strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Custo dos produtos</span>
                                <strong>{formatMoney(productsCost)}</strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Lucro bruto dos produtos</span>
                                <strong
                                  style={{
                                    color: profit >= 0 ? "#198754" : "#dc3545",
                                  }}
                                >
                                  {formatMoney(profit)}
                                </strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Margem dos produtos</span>
                                <strong>{formatPercent(margin)}</strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Frete recebido</span>
                                <strong>{formatMoney(calculateSaleShippingRevenue(sale))}</strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Custo de frete pago pela loja</span>
                                <strong>{formatMoney(calculateSaleShippingCostPaidByStore(sale))}</strong>
                              </p>

                              <p className="d-flex justify-content-between mb-1">
                                <span>Lucro líquido estimado</span>
                                <strong
                                  style={{
                                    color:
                                      calculateSaleNetProfit(sale) >= 0
                                        ? "#198754"
                                        : "#dc3545",
                                  }}
                                >
                                  {formatMoney(calculateSaleNetProfit(sale))}
                                </strong>
                              </p>

                              <hr />

                              <h5 className="d-flex justify-content-between mb-0">
                                <span>Total da venda</span>
                                <strong>{formatMoney(sale.total || 0)}</strong>
                              </h5>
                            </div>

                            {hasReverse && (
                              <div
                                className="p-3 mb-3"
                                style={{
                                  background: "#fff",
                                  borderRadius: 18,
                                  border: `1px solid ${theme.border}`,
                                }}
                              >
                                <h6 className="fw-bold mb-3">
                                  Logística reversa
                                </h6>

                                <div className="row g-3">
                                  <InfoItem
                                    label="Pedido reverso Melhor Envio"
                                    value={
                                      sale.melhorEnvioReverseOrderId ||
                                      "Não informado"
                                    }
                                  />

                                  <InfoItem
                                    label="Código de devolução"
                                    value={
                                      sale.melhorEnvioReverseCode ||
                                      "Aguardando retorno da API"
                                    }
                                  />

                                  <InfoItem
                                    label="Criada em"
                                    value={formatDate(
                                      sale.melhorEnvioReverseCreatedAt,
                                    )}
                                  />

                                  <InfoItem
                                    label="Recebido pela loja"
                                    value={
                                      sale.returnReceivedAt
                                        ? formatDate(sale.returnReceivedAt)
                                        : "Ainda não recebido"
                                    }
                                  />
                                </div>

                                {sale.returnInstructions && (
                                  <pre
                                    className="mb-0 mt-3"
                                    style={{
                                      whiteSpace: "pre-wrap",
                                      fontFamily: "inherit",
                                      color: theme.brownSoft,
                                    }}
                                  >
                                    {sale.returnInstructions}
                                  </pre>
                                )}
                              </div>
                            )}

                            <div
                              className="p-3"
                              style={{
                                background: "#fff",
                                borderRadius: 18,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              <h6 className="fw-bold mb-3">Ações da venda</h6>

                              <label className="form-label">
                                Código de rastreio
                              </label>

                              <input
                                className="form-control mb-3"
                                value={tracking[sale.id] ?? sale.trackingCode ?? ""}
                                disabled={isUpdatingThisSale}
                                onChange={(event) =>
                                  setTracking((prev) => ({
                                    ...prev,
                                    [sale.id]: event.target.value,
                                  }))
                                }
                                placeholder="Ex: BR123456789BR"
                              />

                              {sale.status !== "pronto_envio" &&
                                !sale.melhorEnvioOrderId &&
                                !sale.melhorEnvioPrintUrl && (
                                  <div className="alert alert-warning py-2">
                                    Para comprar/gerar etiqueta, altere o status
                                    para <strong>Pronto para envio</strong>.
                                  </div>
                                )}

                              <div className="d-flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={isUpdatingThisSale}
                                  style={{
                                    background: theme.brown,
                                    color: "#fff",
                                    borderRadius: 999,
                                    opacity: isUpdatingThisSale ? 0.7 : 1,
                                  }}
                                  onClick={() => changeStatus(sale.id, sale.status)}
                                >
                                  {isUpdatingThisSale
                                    ? "Salvando..."
                                    : "Salvar rastreio"}
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={
                                    isUpdatingThisSale ||
                                    generatingLabel[sale.id] ||
                                    Boolean(sale.melhorEnvioOrderId)
                                  }
                                  style={{ borderRadius: 999 }}
                                  onClick={() => simulateLabel(sale)}
                                >
                                  <Tag size={15} className="me-1" />
                                  {generatingLabel[sale.id]
                                    ? "Simulando..."
                                    : "Simular etiqueta"}
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={
                                    isUpdatingThisSale ||
                                    generatingLabel[sale.id] ||
                                    !canBuyLabel
                                  }
                                  style={{
                                    background: canBuyLabel
                                      ? theme.brownDark
                                      : "#9ca3af",
                                    color: "#fff",
                                    borderRadius: 999,
                                    opacity:
                                      isUpdatingThisSale ||
                                      generatingLabel[sale.id] ||
                                      !canBuyLabel
                                        ? 0.7
                                        : 1,
                                    cursor: canBuyLabel ? "pointer" : "not-allowed",
                                  }}
                                  onClick={() => openGenerateLabelModal(sale)}
                                >
                                  <Tag size={15} className="me-1" />
                                  {generatingLabel[sale.id]
                                    ? "Gerando..."
                                    : "Comprar/Gerar etiqueta"}
                                </button>

                                {sale.melhorEnvioPrintUrl && (
                                  <a
                                    href={sale.melhorEnvioPrintUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-secondary"
                                    style={{ borderRadius: 999 }}
                                  >
                                    <Printer size={15} className="me-1" />
                                    Abrir etiqueta
                                  </a>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={
                                    isUpdatingThisSale ||
                                    generatingReverse[sale.id] ||
                                    !canGenerateReverse
                                  }
                                  style={{
                                    borderRadius: 999,
                                    opacity:
                                      isUpdatingThisSale ||
                                      generatingReverse[sale.id] ||
                                      !canGenerateReverse
                                        ? 0.65
                                        : 1,
                                  }}
                                  onClick={() => generateReverseLabel(sale)}
                                >
                                  <Tag size={15} className="me-1" />
                                  {generatingReverse[sale.id]
                                    ? "Gerando reversa..."
                                    : "Gerar reversa"}
                                </button>

                                {sale.melhorEnvioReversePrintUrl && (
                                  <a
                                    href={sale.melhorEnvioReversePrintUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-secondary"
                                    style={{ borderRadius: 999 }}
                                  >
                                    <Printer size={15} className="me-1" />
                                    Abrir reversa
                                  </a>
                                )}

                                {canReceiveReturn && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    disabled={receivingReturn[sale.id]}
                                    style={{ borderRadius: 999 }}
                                    onClick={() => receiveReturnedProducts(sale)}
                                  >
                                    {receivingReturn[sale.id]
                                      ? "Liberando estoque..."
                                      : "Recebi produto"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={isUpdatingThisSale}
                                  style={{ borderRadius: 999 }}
                                  onClick={() => printSale(sale.id)}
                                >
                                  <Printer size={15} className="me-1" />
                                  Imprimir pedido
                                </button>

                                {sale.status === "cancelamento_solicitado" && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={isUpdatingThisSale}
                                    style={{ borderRadius: 999 }}
                                    onClick={() => approveCancel(sale.id)}
                                  >
                                    {isUpdatingThisSale
                                      ? "Aprovando..."
                                      : "Aprovar cancelamento"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {!filteredSales.length && (
                <tr>
                  <td colSpan={10} className="text-center py-4">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default function AdminVendasPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <AdminVendasContent />
    </Suspense>
  );
}
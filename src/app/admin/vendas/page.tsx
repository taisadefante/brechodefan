"use client";

import { Suspense, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Printer, Tag } from "lucide-react";

import {
  approveCancelSale,
  getAllSales,
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

type SaleWithDocument = Sale & {
  customer: CustomerWithDocument;
};

type ApiResponseData = {
  error?: string;
  message?: string;
  details?: unknown;
  orderId?: string;
  printUrl?: string;
};

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

function onlyNumbers(value?: string) {
  return String(value || "").replace(/\D/g, "");
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
  return onlyNumbers(
    customer?.document || customer?.cpf || customer?.cnpj || "",
  );
}

function deliveryTypeLabel(type?: string) {
  if (type === "envio") return "Envio pelos Correios/transportadora";
  if (type === "retirada") return "Retirada em Realengo/RJ";
  if (type === "combinar_whatsapp") return "Uber/99 Entrega via WhatsApp";

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
    <div className="col-md-4">
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
  const [generatingLabel, setGeneratingLabel] = useState<
    Record<string, boolean>
  >({});

  async function load() {
    try {
      const list = (await getAllSales()) as SaleWithDocument[];
      setSales(list);
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
    await updateSaleStatus(id, status, tracking[id]);
    await load();
  }

  async function approveCancel(id: string) {
    if (!confirm("Aprovar cancelamento e liberar produtos?")) return;

    await approveCancelSale(id);
    await load();
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
      alert(
        "CPF/CNPJ não encontrado nesta venda. Adicione o CPF/CNPJ do cliente nos dados da venda ou crie uma nova venda com documento válido.",
      );
      return null;
    }

    if (!isValidCpfOrCnpj(document)) {
      alert(
        "CPF/CNPJ inválido. O Melhor Envio exige CPF/CNPJ real e válido para simular ou gerar etiqueta.",
      );
      return null;
    }

    if (!customer.cep || !customer.address || !customer.number) {
      alert("Dados do cliente incompletos para etiqueta.");
      return null;
    }

    return customer;
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
        console.error("Erro simulação etiqueta:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });

        showApiError(
          data,
          `Erro ao simular etiqueta. Status ${response.status}: ${response.statusText}`,
        );

        return;
      }

      alert(
        data.message ||
          "Simulação concluída com sucesso. Nenhuma etiqueta foi comprada.",
      );
    } catch (error) {
      console.error("Erro ao simular etiqueta:", error);
      alert("Erro ao simular etiqueta.");
    } finally {
      setGeneratingLabel((prev) => ({ ...prev, [sale.id]: false }));
    }
  }

  async function generateLabel(sale: SaleWithDocument) {
    const customerForLabel = validateLabelData(sale);
    if (!customerForLabel) return;

    if (sale.melhorEnvioOrderId || sale.melhorEnvioPrintUrl) {
      alert(
        "Essa venda já possui etiqueta gerada. Use o botão para abrir/imprimir novamente.",
      );
      return;
    }

    const confirmGenerate = window.confirm(
      "Atenção: gerar etiqueta agora pode comprar a etiqueta no Melhor Envio. Deseja continuar?",
    );

    if (!confirmGenerate) return;

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
        console.error("Erro etiqueta:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });

        showApiError(
          data,
          `Erro ao gerar etiqueta. Status ${response.status}: ${response.statusText}`,
        );

        return;
      }

      await updateSaleShippingLabel(sale.id, {
        melhorEnvioOrderId: data.orderId || "",
        melhorEnvioPrintUrl: data.printUrl || "",
        trackingCode: sale.trackingCode || "",
      });

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
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #3b2418;
            }

            .product {
              display: flex;
              gap: 12px;
              border-bottom: 1px solid #eee;
              padding: 10px 0;
            }

            .product img {
              width: 70px;
              height: 85px;
              object-fit: contain;
              background: #f3eadf;
              border-radius: 8px;
            }

            small {
              color: #7a5c4c;
            }
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

  if (loadingAdmin) {
    return <main className="container pb-5">Carregando...</main>;
  }

  if (!adminUser || !isAdmin) {
    return (
      <main className="container pb-5">
        <div className="alert alert-danger">
          Acesso restrito. Entre pelo painel admin.
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
        <h1 className="fw-bold mb-1">Vendas</h1>

        <p className="mb-0" style={{ color: theme.brownSoft }}>
          Gerencie pedidos, pagamentos, frete e etiquetas.
        </p>
      </div>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="fw-bold mb-1">Vendas registradas</h2>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Clique em uma venda para ver todos os dados.
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
            }}
          >
            Atualizar
          </button>
        </div>

        {sales.map((sale) => {
          const isOpen = openSaleId === sale.id;
          const shippingAddress = sale.shippingAddress || null;
          const customerDocument = getCustomerDocument(sale.customer);

          return (
            <div
              key={sale.id}
              className="mb-3"
              style={{
                background: theme.ivory2,
                borderRadius: 26,
                boxShadow: theme.shadow,
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenSaleId(isOpen ? null : sale.id)}
                className="w-100 text-start"
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 20,
                }}
              >
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Pedido #{sale.id.slice(0, 8)}
                    </h5>

                    <p className="mb-0" style={{ color: theme.brownSoft }}>
                      {sale.customer?.name || "Cliente não informado"} •{" "}
                      {sale.items?.length || 0} produto(s)
                    </p>
                  </div>

                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span
                      className="badge"
                      style={{
                        background: theme.brown,
                        padding: "8px 10px",
                      }}
                    >
                      {statusLabel(sale.status)}
                    </span>

                    <strong>{formatMoney(sale.total || 0)}</strong>

                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div
                  id={`sale-print-${sale.id}`}
                  style={{
                    borderTop: `1px solid ${theme.border}`,
                    padding: 20,
                  }}
                >
                  <div className="row g-3 mb-3">
                    <InfoItem label="ID completo do pedido" value={`#${sale.id}`} />
                    <InfoItem label="ID do usuário" value={text(sale.userId)} />
                    <InfoItem label="Status" value={statusLabel(sale.status)} />
                    <InfoItem label="Criado em" value={formatDate(sale.createdAt)} />
                    <InfoItem label="Atualizado em" value={formatDate(sale.updatedAt)} />

                    <InfoItem
                      label="Tipo de entrega"
                      value={deliveryTypeLabel(sale.deliveryType)}
                    />

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

                    <InfoItem
                      label="Telefone/WhatsApp"
                      value={text(sale.customer?.phone)}
                    />

                    <InfoItem label="CEP" value={text(sale.customer?.cep)} />

                    <InfoItem
                      label="Rua/Avenida"
                      value={text(sale.customer?.address)}
                    />

                    <InfoItem label="Número" value={text(sale.customer?.number)} />

                    <InfoItem
                      label="Complemento"
                      value={text(sale.customer?.complement)}
                    />

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

                    <InfoItem
                      label="Transportadora"
                      value={text(sale.shippingOption?.company)}
                    />

                    <InfoItem
                      label="Serviço"
                      value={text(sale.shippingOption?.name)}
                    />

                    <InfoItem
                      label="Valor do frete"
                      value={formatMoney(sale.deliveryPrice || 0)}
                    />

                    <InfoItem
                      label="ID Melhor Envio"
                      value={text(sale.melhorEnvioOrderId)}
                    />

                    <InfoItem
                      label="Código de rastreio"
                      value={text(sale.trackingCode)}
                    />
                  </div>

                  <div
                    className="p-3 mb-3"
                    style={{
                      background: "#fffaf2",
                      borderRadius: 18,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <h6 className="fw-bold mb-3">Produtos comprados</h6>

                    <div className="d-grid gap-2">
                      {sale.items?.map((item) => (
                        <div
                          key={item.id}
                          className="d-flex align-items-center gap-3 p-2"
                          style={{
                            background: "#fff",
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

                            <div style={{ fontSize: 13 }}>ID: {item.id}</div>

                            <div style={{ fontSize: 13 }}>
                              Quantidade: {item.quantity || 1}
                            </div>

                            <div style={{ fontSize: 13 }}>
                              Valor unitário: {formatMoney(item.price || 0)}
                            </div>
                          </div>

                          <strong>
                            {formatMoney(
                              Number(item.price || 0) *
                                Number(item.quantity || 1),
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="p-3 mb-3"
                    style={{
                      background: "#fffaf2",
                      borderRadius: 18,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <h6 className="fw-bold mb-3">Resumo financeiro</h6>

                    <p className="d-flex justify-content-between mb-1">
                      <span>Subtotal dos produtos</span>
                      <strong>{formatMoney(sale.subtotal || 0)}</strong>
                    </p>

                    <p className="d-flex justify-content-between mb-1">
                      <span>Frete</span>
                      <strong>{formatMoney(sale.deliveryPrice || 0)}</strong>
                    </p>

                    <hr />

                    <h5 className="d-flex justify-content-between mb-0">
                      <span>Total da venda</span>
                      <strong>{formatMoney(sale.total || 0)}</strong>
                    </h5>
                  </div>

                  <div
                    className="p-3"
                    style={{
                      background: "#fffaf2",
                      borderRadius: 18,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <h6 className="fw-bold mb-3">Ações da venda</h6>

                    <label className="form-label">Status</label>

                    <select
                      className="form-select mb-2"
                      value={sale.status}
                      onChange={(event) =>
                        changeStatus(sale.id, event.target.value as SaleStatus)
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>

                    <label className="form-label">Código de rastreio</label>

                    <input
                      className="form-control mb-3"
                      value={tracking[sale.id] ?? sale.trackingCode ?? ""}
                      onChange={(event) =>
                        setTracking((prev) => ({
                          ...prev,
                          [sale.id]: event.target.value,
                        }))
                      }
                      placeholder="Ex: BR123456789BR"
                    />

                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: theme.brown,
                          color: "#fff",
                          borderRadius: 999,
                        }}
                        onClick={() => changeStatus(sale.id, sale.status)}
                      >
                        Salvar rastreio/status
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={
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
                          generatingLabel[sale.id] ||
                          Boolean(sale.melhorEnvioOrderId)
                        }
                        style={{
                          background: theme.brownDark,
                          color: "#fff",
                          borderRadius: 999,
                        }}
                        onClick={() => generateLabel(sale)}
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
                          Abrir / imprimir etiqueta
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
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
                          style={{ borderRadius: 999 }}
                          onClick={() => approveCancel(sale.id)}
                        >
                          Aprovar cancelamento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!sales.length && (
          <div className="alert alert-warning">
            Nenhuma venda registrada ainda.
          </div>
        )}
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
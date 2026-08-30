"use client";

import { Suspense, useState } from "react";
import {
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";

type DeliveryOption =
  | "retirada_realengo"
  | "retirada_centro"
  | "retirada_estacao"
  | "envio_uber"
  | "envio_correio"
  | "envio_mercado_livre"
  | "envio_combinar";

type AddressForm = {
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const STORE_WHATSAPP = "5521988359825";

const emptyAddress: AddressForm = {
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  retirada_realengo: "Retirada em Realengo",
  retirada_centro: "Retirada no Centro",
  retirada_estacao: "Retirada na Estação",
  envio_uber: "Envio por Uber",
  envio_correio: "Envio pelos Correios",
  envio_mercado_livre: "Envio pelo Mercado Livre",
  envio_combinar: "Envio a combinar com a loja",
};

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCep(value: string) {
  const clean = onlyNumbers(value).slice(0, 8);

  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

function CarrinhoContent() {
  const { items, subtotal, removeFromCart, updateQuantity, clearCart } = useCart();

  const [deliveryType, setDeliveryType] =
    useState<DeliveryOption>("retirada_realengo");

  const [customerName, setCustomerName] = useState("");
  const [observation, setObservation] = useState("");
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [loading, setLoading] = useState(false);

  const isShipping = deliveryType.startsWith("envio_");
  const deliveryLabel = DELIVERY_LABELS[deliveryType];

  function updateAddress<K extends keyof AddressForm>(
    field: K,
    value: AddressForm[K],
  ) {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function buscarCep() {
    const cleanCep = onlyNumbers(addressForm.cep);

    if (cleanCep.length !== 8) {
      alert("Digite um CEP válido com 8 números.");
      return;
    }

    setBuscandoCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!response.ok || data?.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setAddressForm((prev) => ({
        ...prev,
        cep: cleanCep,
        address: data.logradouro || prev.address,
        district: data.bairro || prev.district,
        city: data.localidade || prev.city,
        state: (data.uf || prev.state).toUpperCase(),
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function validateBeforeSend() {
    if (!items.length) {
      alert("Seu carrinho está vazio.");
      return false;
    }

    if (!customerName.trim()) {
      alert("Informe seu nome.");
      return false;
    }


    const invalidStockItem = items.find(
      (item) => Number(item.quantity || 1) > Number(item.stock || 0),
    );

    if (invalidStockItem) {
      alert(
        `O produto "${invalidStockItem.name}" tem apenas ${invalidStockItem.stock} unidade(s) em estoque.`,
      );
      return false;
    }

    if (isShipping) {
      const cleanCep = onlyNumbers(addressForm.cep);

      if (cleanCep.length !== 8) {
        alert("Para envio, informe um CEP válido com 8 números.");
        return false;
      }

      if (
        !addressForm.address.trim() ||
        !addressForm.number.trim() ||
        !addressForm.district.trim() ||
        !addressForm.city.trim() ||
        !addressForm.state.trim()
      ) {
        alert("Para envio, preencha o endereço completo.");
        return false;
      }
    }

    return true;
  }

  function buildWhatsAppMessage(saleId: string) {
    const lines: string[] = [];

    lines.push("🛍️ *NOVO PEDIDO PELO SITE*");
    lines.push("");
    lines.push(
      `🧾 *Pedido:* #${saleId.slice(0, 8)} | 👤 *Cliente:* ${customerName.trim()} | 📦 *Entrega:* ${deliveryLabel}`,
    );
    lines.push("");
    lines.push("*PRODUTOS*");

    items.forEach((item, index) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const itemTotal = unitPrice * quantity;
      const details = [item.size, item.color].filter(Boolean).join(" • ");

      const parts = [
        `${index + 1}. *${item.name}*`,
        details || null,
        `Qtd: ${quantity}`,
        `Unit.: ${formatMoney(unitPrice)}`,
        `*Subtotal: ${formatMoney(itemTotal)}*`,
      ].filter(Boolean);

      lines.push(parts.join(" | "));
    });

    lines.push("");

    if (isShipping) {
      const fullAddress = [
        `${addressForm.address.trim()}, ${addressForm.number.trim()}${
          addressForm.complement.trim()
            ? ` - ${addressForm.complement.trim()}`
            : ""
        }`,
        addressForm.district.trim(),
        `${addressForm.city.trim()}/${addressForm.state.trim().toUpperCase()}`,
        `CEP ${formatCep(addressForm.cep)}`,
      ].join(" | ");

      lines.push(`🚚 *Frete:* a combinar com a loja | 📍 *Endereço:* ${fullAddress}`);
    } else {
      lines.push(`📍 *Retirada:* ${deliveryLabel} | 🚚 *Frete:* não se aplica`);
    }

    lines.push(`💰 *TOTAL DOS PRODUTOS: ${formatMoney(subtotal)}*`);

    if (observation.trim()) {
      lines.push(`📝 *Observação:* ${observation.trim()}`);
    }

    lines.push("");
    lines.push("✅ Gostaria de confirmar este pedido e combinar os próximos passos.");

    return lines.join("\n");
  }

  async function enviarCarrinhoWhatsApp() {
    if (!validateBeforeSend()) return;

    setLoading(true);

    // Abre a aba no clique do usuário para evitar bloqueio de popup.
    const whatsappWindow = window.open("about:blank", "_blank");

    try {
      const response = await fetch("/api/pedidos/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          deliveryOption: deliveryType,
          observation: observation.trim(),
          address: isShipping
            ? {
                cep: onlyNumbers(addressForm.cep),
                address: addressForm.address.trim(),
                number: addressForm.number.trim(),
                complement: addressForm.complement.trim(),
                district: addressForm.district.trim(),
                city: addressForm.city.trim(),
                state: addressForm.state.trim().toUpperCase(),
              }
            : null,
          items: items.map((item) => ({
            id: item.id,
            quantity: Math.max(Number(item.quantity || 1), 1),
          })),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            saleId?: string;
            error?: string;
            details?: string;
          }
        | null;

      if (!response.ok || !data?.saleId) {
        throw new Error(
          data?.details ||
            data?.error ||
            `Erro ${response.status} ao registrar o pedido.`,
        );
      }

      const message = buildWhatsAppMessage(data.saleId);
      const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(
        message,
      )}`;

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }

      clearCart();
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      console.error("Erro ao registrar/enviar o carrinho:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao registrar o pedido.";

      alert(`Não foi possível registrar o pedido em Vendas.

${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-2">Carrinho</h1>
        <p className="mb-0" style={{ color: theme.brownSoft }}>
          Revise seus produtos, escolha a forma de entrega e envie o pedido
          diretamente para a loja pelo WhatsApp. Não é necessário fazer login ou
          cadastro.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          {items.map((item) => {
            const quantity = Number(item.quantity || 1);
            const stock = Math.max(Number(item.stock || 0), 0);
            const maxReached = quantity >= stock;
            const itemSubtotal = Number(item.price || 0) * quantity;
            const itemInfo = [item.size, item.color].filter(Boolean).join(" • ");

            return (
              <div
                key={item.id}
                className="mb-2"
                style={{
                  background: theme.ivory2,
                  borderRadius: 18,
                  boxShadow: "0 10px 26px rgba(54,35,24,.08)",
                  border: `1px solid ${theme.border}`,
                  padding: 10,
                }}
              >
                <div
                  className="d-flex align-items-center gap-2 gap-md-3"
                  style={{ minHeight: 76 }}
                >
                  <img
                    src={item.images?.[0] || ""}
                    alt={item.name}
                    style={{
                      width: 58,
                      height: 70,
                      objectFit: "contain",
                      background: "#f3eadf",
                      borderRadius: 13,
                      flexShrink: 0,
                    }}
                  />

                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div style={{ minWidth: 0 }}>
                        <h6
                          className="fw-bold mb-1 text-truncate"
                          title={item.name}
                          style={{ color: theme.brownDark }}
                        >
                          {item.name}
                        </h6>

                        <div
                          className="d-flex flex-wrap align-items-center gap-2"
                          style={{ fontSize: 13, color: theme.brownSoft }}
                        >
                          {itemInfo && <span>{itemInfo}</span>}

                          <span>
                            Estoque: <strong>{stock}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFromCart(item.id)}
                        title="Remover produto"
                        aria-label="Remover produto"
                        style={{
                          borderRadius: "50%",
                          width: 34,
                          height: 34,
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="d-flex align-items-center justify-content-between gap-2 mt-2 flex-wrap">
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={quantity <= 1}
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          style={{
                            borderRadius: "50%",
                            width: 30,
                            height: 30,
                            padding: 0,
                          }}
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={stock || 1}
                          value={quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, Number(e.target.value || 1))
                          }
                          className="form-control form-control-sm text-center"
                          style={{
                            width: 56,
                            height: 30,
                            borderRadius: 999,
                            padding: "2px 6px",
                          }}
                        />

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={stock <= 0 || maxReached}
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          style={{
                            borderRadius: "50%",
                            width: 30,
                            height: 30,
                            padding: 0,
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div
                        className="d-flex align-items-center gap-2 ms-auto"
                        style={{
                          fontSize: 14,
                          color: theme.brownDark,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>Qtd. {quantity}</span>
                        <strong style={{ color: theme.brown }}>
                          {formatMoney(itemSubtotal)}
                        </strong>
                      </div>
                    </div>

                    {maxReached && stock > 0 && (
                      <small style={{ color: theme.brownSoft }}>
                        Quantidade máxima disponível em estoque.
                      </small>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!items.length && (
            <div className="alert alert-warning" style={{ borderRadius: 18 }}>
              Seu carrinho está vazio.
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <div
            className="p-4"
            style={{
              background: theme.ivory2,
              borderRadius: 28,
              boxShadow: theme.shadow,
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-3">
              <PackageCheck size={22} style={{ color: theme.brown }} />
              <h4 className="fw-bold mb-0">Finalizar pedido</h4>
            </div>

            <label className="form-label fw-semibold">Seu nome</label>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Nome completo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ borderRadius: 14 }}
            />


            <label className="form-label fw-semibold">Forma de entrega</label>
            <select
              className="form-select mb-3"
              value={deliveryType}
              onChange={(e) =>
                setDeliveryType(e.target.value as DeliveryOption)
              }
              style={{ borderRadius: 14 }}
            >
              <optgroup label="Retirada">
                <option value="retirada_realengo">Retirada em Realengo</option>
                <option value="retirada_centro">Retirada no Centro</option>
                <option value="retirada_estacao">Retirada na Estação</option>
              </optgroup>

              <optgroup label="Envio">
                <option value="envio_uber">Envio por Uber</option>
                <option value="envio_correio">Envio pelos Correios</option>
                <option value="envio_mercado_livre">
                  Envio pelo Mercado Livre
                </option>
                <option value="envio_combinar">
                  Envio a combinar com a loja
                </option>
              </optgroup>
            </select>

            <div
              className="p-3 mb-3"
              style={{
                background: "#fff",
                borderRadius: 18,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div className="d-flex gap-2 align-items-start">
                {isShipping ? (
                  <Truck size={20} style={{ color: theme.brown, flexShrink: 0 }} />
                ) : (
                  <Store size={20} style={{ color: theme.brown, flexShrink: 0 }} />
                )}

                <div>
                  <strong>{deliveryLabel}</strong>
                  <div style={{ color: theme.brownSoft, fontSize: 14 }}>
                    {isShipping
                      ? "O valor do frete não é calculado no site. A loja combinará o valor com você pelo WhatsApp."
                      : "A retirada não possui cobrança de frete."}
                  </div>
                </div>
              </div>
            </div>

            {isShipping && (
              <div
                className="p-3 mb-3"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-3">
                  <MapPin size={19} style={{ color: theme.brown }} />
                  <h5 className="fw-bold mb-0">Endereço de entrega</h5>
                </div>

                <p className="small mb-3" style={{ color: theme.brownSoft }}>
                  Como você escolheu envio, preencha o endereço completo. Essas
                  informações serão enviadas junto com o carrinho para o WhatsApp.
                </p>

                <label className="form-label fw-semibold">CEP</label>
                <div className="input-group mb-3">
                  <input
                    className="form-control"
                    placeholder="00000-000"
                    value={formatCep(addressForm.cep)}
                    onChange={(e) => updateAddress("cep", onlyNumbers(e.target.value))}
                    maxLength={9}
                  />

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={buscarCep}
                    disabled={buscandoCep}
                  >
                    {buscandoCep ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>

                <label className="form-label fw-semibold">Rua / Avenida</label>
                <input
                  className="form-control mb-3"
                  placeholder="Rua / Avenida"
                  value={addressForm.address}
                  onChange={(e) => updateAddress("address", e.target.value)}
                  style={{ borderRadius: 14 }}
                />

                <div className="row g-2">
                  <div className="col-5">
                    <label className="form-label fw-semibold">Número</label>
                    <input
                      className="form-control mb-3"
                      placeholder="Número"
                      value={addressForm.number}
                      onChange={(e) => updateAddress("number", e.target.value)}
                      style={{ borderRadius: 14 }}
                    />
                  </div>

                  <div className="col-7">
                    <label className="form-label fw-semibold">Complemento</label>
                    <input
                      className="form-control mb-3"
                      placeholder="Apto, bloco, casa..."
                      value={addressForm.complement}
                      onChange={(e) => updateAddress("complement", e.target.value)}
                      style={{ borderRadius: 14 }}
                    />
                  </div>
                </div>

                <label className="form-label fw-semibold">Bairro</label>
                <input
                  className="form-control mb-3"
                  placeholder="Bairro"
                  value={addressForm.district}
                  onChange={(e) => updateAddress("district", e.target.value)}
                  style={{ borderRadius: 14 }}
                />

                <div className="row g-2">
                  <div className="col-8">
                    <label className="form-label fw-semibold">Cidade</label>
                    <input
                      className="form-control"
                      placeholder="Cidade"
                      value={addressForm.city}
                      onChange={(e) => updateAddress("city", e.target.value)}
                      style={{ borderRadius: 14 }}
                    />
                  </div>

                  <div className="col-4">
                    <label className="form-label fw-semibold">UF</label>
                    <input
                      className="form-control"
                      placeholder="RJ"
                      maxLength={2}
                      value={addressForm.state}
                      onChange={(e) =>
                        updateAddress("state", e.target.value.toUpperCase())
                      }
                      style={{ borderRadius: 14 }}
                    />
                  </div>
                </div>
              </div>
            )}

            <label className="form-label fw-semibold">Observação</label>
            <textarea
              className="form-control mb-3"
              rows={3}
              placeholder="Alguma observação sobre o pedido? (opcional)"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              style={{ borderRadius: 14, resize: "vertical" }}
            />

            <hr />

            <p className="d-flex justify-content-between mb-2">
              <span>Produtos</span>
              <strong>{formatMoney(subtotal)}</strong>
            </p>

            <p className="d-flex justify-content-between mb-2">
              <span>Frete</span>
              <strong>{isShipping ? "A combinar" : "Grátis"}</strong>
            </p>

            <h4
              className="d-flex justify-content-between mt-3 pt-3"
              style={{ borderTop: `1px solid ${theme.border}` }}
            >
              <span>Total dos produtos</span>
              <strong>{formatMoney(subtotal)}</strong>
            </h4>

            <small className="d-block mb-3" style={{ color: theme.brownSoft }}>
              {isShipping
                ? "O valor do frete será informado pela loja no WhatsApp e não está incluído acima."
                : "Não há cobrança de frete para retirada."}
            </small>

            <button
              type="button"
              disabled={loading || !items.length}
              onClick={enviarCarrinhoWhatsApp}
              className="btn btn-lg w-100"
              style={{
                background: "#25D366",
                color: "#fff",
                borderRadius: 999,
                border: 0,
                fontWeight: 700,
              }}
            >
              {loading ? "Registrando pedido..." : "Enviar carrinho pelo WhatsApp"}
            </button>

            <div
              className="text-center mt-2"
              style={{ fontSize: 13, color: theme.brownSoft }}
            >
              O pedido será registrado em Vendas e depois aberto no WhatsApp.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CarrinhoPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <CarrinhoContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { createSale, getCustomerData } from "@/lib/firestore";
import { CustomerData, DeliveryType, ShippingOption } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";

const emptyCustomer: CustomerData = {
  name: "",
  email: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

const WHATSAPP_URL =
  "https://wa.me/5521988359825?text=Olá! Quero consultar entrega por Uber/99.";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, subtotal, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("envio");
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [cepDestino, setCepDestino] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingOption | null>(null);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const deliveryPrice =
    deliveryType === "envio" && selectedShipping
      ? Number(selectedShipping.price || 0)
      : 0;

  const total = subtotal + deliveryPrice;

  useEffect(() => {
    async function loadCustomer() {
      if (!user) return;

      setLoadingCustomer(true);

      try {
        const data = await getCustomerData(user.uid);

        if (data) {
          const mergedCustomer: CustomerData = {
            ...emptyCustomer,
            ...data,
            email: user.email || data.email || "",
          };

          setCustomer(mergedCustomer);
          setCepDestino(mergedCustomer.cep || "");
        } else {
          setCustomer({
            ...emptyCustomer,
            email: user.email || "",
          });
        }
      } finally {
        setLoadingCustomer(false);
      }
    }

    loadCustomer();
  }, [user]);

  useEffect(() => {
    setSelectedShipping(null);
    setShippingOptions([]);
  }, [cepDestino, deliveryType]);

  async function calcularFrete() {
    const cleanCep = onlyNumbers(cepDestino);

    if (!cleanCep || !items.length) return;

    if (cleanCep.length !== 8) {
      alert("Digite um CEP válido com 8 números.");
      return;
    }

    setCalculandoFrete(true);
    setSelectedShipping(null);
    setShippingOptions([]);

    try {
      const response = await fetch("/api/frete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cepDestino: cleanCep,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro ao calcular frete:", data);
        alert(data.error || "Erro ao calcular frete.");
        return;
      }

      const options = Array.isArray(data.options) ? data.options : [];

      if (!options.length) {
        alert("Nenhuma opção de frete encontrada para este CEP.");
        return;
      }

      setShippingOptions(options);
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      alert("Erro ao calcular frete.");
    } finally {
      setCalculandoFrete(false);
    }
  }

  async function finalizar() {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!items.length) return;

    if (deliveryType === "envio" && !selectedShipping) {
      alert("Calcule e selecione uma opção de frete antes de finalizar.");
      return;
    }

    setLoading(true);

    try {
      const finalCustomer: CustomerData = {
        ...emptyCustomer,
        ...customer,
        cep: cepDestino || customer.cep,
        email: user.email || customer.email,
      };

      const response = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, deliveryPrice, customer: finalCustomer }),
      });

      const payment = await response.json();

      if (!response.ok) {
        console.error("Erro Mercado Pago:", payment);
        alert(payment.error || "Erro ao gerar pagamento.");
        return;
      }

      const saleId = await createSale({
        userId: user.uid,
        customer: finalCustomer,
        items,
        subtotal,
        deliveryType,
        deliveryPrice,
        paymentUrl: payment.init_point || "",
        mercadoPagoPreferenceId: payment.id || "",
      });

      clearCart();

      if (payment.init_point) {
        window.location.href = payment.init_point;
      } else {
        router.push(`/minha-conta?pedido=${saleId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-5">
      <h1 className="fw-bold mb-2">Carrinho</h1>

      <p style={{ color: theme.brownSoft }}>
        Revise suas peças e finalize sua compra com segurança.
      </p>

      <div className="row g-4">
        <div className="col-lg-7">
          {items.map((item) => (
            <div
              key={item.id}
              className="d-flex gap-3 p-3 mb-3"
              style={{
                background: theme.ivory2,
                borderRadius: 22,
                boxShadow: theme.shadow,
              }}
            >
              <img
                src={item.images?.[0] || ""}
                alt={item.name}
                style={{
                  width: 100,
                  height: 120,
                  objectFit: "contain",
                  background: "#f3eadf",
                  borderRadius: 18,
                }}
              />

              <div className="flex-grow-1">
                <h5 className="fw-bold">{item.name}</h5>

                {[item.size, item.color].filter(Boolean).length > 0 && (
                  <p className="mb-1">
                    {[item.size, item.color].filter(Boolean).join(" • ")}
                  </p>
                )}

                <strong>{formatMoney(item.price)}</strong>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger h-25"
                onClick={() => removeFromCart(item.id)}
              >
                Remover
              </button>
            </div>
          ))}

          {!items.length && (
            <div className="alert alert-warning">Seu carrinho está vazio.</div>
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
            <h4 className="fw-bold">Entrega</h4>

            <select
              className="form-select mb-3"
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
            >
              <option value="envio">
                Envio pelos Correios/transportadora - calcular frete
              </option>
              <option value="retirada">Retirada em Realengo/RJ - grátis</option>
              <option value="combinar_whatsapp">
                Uber / 99 Entrega - consultar WhatsApp
              </option>
            </select>

            {deliveryType === "envio" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  CEP para calcular frete
                </label>

                <div className="input-group">
                  <input
                    className="form-control"
                    placeholder="Digite o CEP"
                    value={cepDestino}
                    onChange={(e) => setCepDestino(e.target.value)}
                  />

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={calcularFrete}
                    disabled={calculandoFrete || !cepDestino || !items.length}
                  >
                    {calculandoFrete ? "Calculando..." : "Calcular"}
                  </button>
                </div>

                <small style={{ color: theme.brownSoft }}>
                  Se você já tem CEP no cadastro, ele aparece preenchido, mas
                  pode ser alterado.
                </small>

                {shippingOptions.length > 0 && (
                  <div className="mt-3">
                    <label className="form-label fw-semibold">
                      Escolha o frete
                    </label>

                    <div className="d-grid gap-2">
                      {shippingOptions.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          className="btn text-start"
                          onClick={() => setSelectedShipping(option)}
                          style={{
                            borderRadius: 16,
                            border:
                              selectedShipping?.id === option.id
                                ? `2px solid ${theme.brown}`
                                : `1px solid ${theme.border}`,
                            background:
                              selectedShipping?.id === option.id
                                ? "#f1e6d8"
                                : "#fff",
                          }}
                        >
                          <strong>
                            {option.company} - {option.name}
                          </strong>
                          <br />
                          <span>{formatMoney(option.price)}</span>

                          {option.deliveryTime && (
                            <small style={{ color: theme.brownSoft }}>
                              {" "}
                              • prazo: {option.deliveryTime} dia(s)
                            </small>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {deliveryType === "combinar_whatsapp" && (
              <div
                className="p-3 mb-3"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <p className="mb-2">
                  O valor da entrega por Uber/99 será consultado pelo WhatsApp.
                </p>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-success w-100"
                  style={{ borderRadius: 999 }}
                >
                  <MessageCircle size={18} className="me-2" />
                  Consultar WhatsApp
                </a>
              </div>
            )}

            <hr />

            <p className="d-flex justify-content-between">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </p>

            <p className="d-flex justify-content-between">
              <span>Entrega</span>
              <strong>
                {deliveryType === "envio" && !selectedShipping
                  ? "Calcule o frete"
                  : formatMoney(deliveryPrice)}
              </strong>
            </p>

            <h4 className="d-flex justify-content-between">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </h4>

            {!user ? (
              <div className="mt-4">
                <h5 className="fw-bold">Entre ou crie sua conta</h5>

                <p style={{ color: theme.brownSoft }}>
                  Para finalizar a compra, faça login ou cadastre-se.
                </p>

                <div className="d-grid gap-2">
                  <Link
                    href="/login"
                    className="btn btn-lg"
                    style={{
                      background: theme.brown,
                      color: "#fff",
                      borderRadius: 999,
                    }}
                  >
                    Fazer login
                  </Link>

                  <Link
                    href="/cadastro"
                    className="btn btn-lg btn-outline-secondary"
                    style={{ borderRadius: 999 }}
                  >
                    Criar cadastro
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h4 className="fw-bold mt-4">Dados da conta</h4>

                {loadingCustomer ? (
                  <p>Carregando seus dados...</p>
                ) : (
                  <div
                    className="p-3 mb-3"
                    style={{
                      background: "#fff",
                      borderRadius: 18,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {customer.name && <p className="mb-1">{customer.name}</p>}

                    <p className="mb-1">{user.email}</p>

                    {customer.phone && <p className="mb-1">{customer.phone}</p>}

                    {(customer.address || customer.city || customer.state) && (
                      <p className="mb-0" style={{ color: theme.brownSoft }}>
                        {[
                          customer.address,
                          customer.number,
                          customer.complement,
                          customer.district,
                          customer.city,
                          customer.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    <Link
                      href="/minha-conta"
                      className="btn btn-sm btn-outline-secondary mt-3"
                      style={{ borderRadius: 999 }}
                    >
                      Atualizar cadastro
                    </Link>
                  </div>
                )}

                <button
                  disabled={loading || !items.length}
                  onClick={finalizar}
                  className="btn btn-lg w-100 mt-3"
                  style={{
                    background: theme.brown,
                    color: "#fff",
                    borderRadius: 999,
                  }}
                >
                  {loading ? "Finalizando..." : "Finalizar com Mercado Pago"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

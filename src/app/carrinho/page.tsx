"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Home,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  createSale,
  getCustomerAddresses,
  getCustomerData,
  saveCustomerAddress,
  saveCustomerData,
} from "@/lib/firestore";
import {
  CustomerAddress,
  CustomerData,
  DeliveryType,
  ShippingOption,
} from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";

type CustomerDataWithDocument = CustomerData & {
  document?: string;
};

const emptyCustomer: CustomerDataWithDocument = {
  name: "",
  email: "",
  phone: "",
  document: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

const emptyAddressForm = {
  name: "",
  recipientName: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  isDefault: false,
};

const WHATSAPP_URL =
  "https://wa.me/5521988359825?text=Olá! Quero consultar entrega por Uber/99.";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const clean = onlyNumbers(value).slice(0, 11);

  return clean
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function CarrinhoContent() {
  const router = useRouter();
  const { items, subtotal, removeFromCart, updateQuantity, clearCart } =
    useCart();
  const { user, login, register } = useAuth();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("envio");
  const [customer, setCustomer] =
    useState<CustomerDataWithDocument>(emptyCustomer);

  const [cepDestino, setCepDestino] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] =
    useState<ShippingOption | null>(null);

  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "cadastro">("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authDocument, setAuthDocument] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) || null;

  const deliveryPrice =
    deliveryType === "envio" && selectedShipping
      ? Number(selectedShipping.price || 0)
      : 0;

  const total = subtotal + deliveryPrice;

  async function loadAddresses(userId: string) {
    const list = await getCustomerAddresses(userId);
    setAddresses(list);

    setSelectedAddressId("");
    setCepDestino("");
    setSelectedShipping(null);
    setShippingOptions([]);
  }

  useEffect(() => {
    async function loadCustomer() {
      if (!user) {
        setCustomer(emptyCustomer);
        setAddresses([]);
        setSelectedAddressId("");
        setCepDestino("");
        setSelectedShipping(null);
        setShippingOptions([]);
        return;
      }

      setLoadingCustomer(true);

      try {
        const data = (await getCustomerData(
          user.uid,
        )) as CustomerDataWithDocument | null;

        if (data) {
          setCustomer({
            ...emptyCustomer,
            ...data,
            document: onlyNumbers(data.document || ""),
            email: user.email || data.email || "",
          });
        } else {
          setCustomer({
            ...emptyCustomer,
            email: user.email || "",
          });
        }

        await loadAddresses(user.uid);
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
      } finally {
        setLoadingCustomer(false);
      }
    }

    loadCustomer();
  }, [user]);

  useEffect(() => {
    setSelectedShipping(null);
    setShippingOptions([]);
  }, [deliveryType, items.length]);

  function openAuthModal(mode: "login" | "cadastro") {
    setAuthMode(mode);
    setAuthError("");
    setAuthPassword("");
    setAuthEmail(customer.email || "");
    setAuthName(customer.name || "");
    setAuthPhone(customer.phone || "");
    setAuthDocument(customer.document || "");
    setAuthModal(true);
  }

  function renderShippingOptions() {
    if (shippingOptions.length <= 0) return null;

    return (
      <div className="mt-3 mb-3">
        <label className="form-label fw-semibold">Escolha o frete</label>

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
                  selectedShipping?.id === option.id ? "#f1e6d8" : "#fff",
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
    );
  }

  async function handleSelectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    setSelectedShipping(null);
    setShippingOptions([]);

    const address = addresses.find((item) => item.id === addressId);

    if (!address) {
      setCepDestino("");
      return;
    }

    const cleanCep = onlyNumbers(address.cep || "");

    if (cleanCep.length !== 8) {
      alert("O endereço selecionado não possui um CEP válido.");
      return;
    }

    setCepDestino(cleanCep);

    if (items.length > 0) {
      await calcularFretePorCep(cleanCep);
    }
  }

  async function submitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        await login(authEmail.trim(), authPassword);
      } else {
        const cleanDocument = onlyNumbers(authDocument);

        if (cleanDocument.length !== 11) {
          setAuthError("Digite um CPF válido com 11 números.");
          return;
        }

        const credential = await register(authEmail.trim(), authPassword);

        const newCustomer: CustomerDataWithDocument = {
          ...emptyCustomer,
          ...customer,
          name: authName,
          phone: authPhone,
          document: cleanDocument,
          email: authEmail.trim(),
        };

        await saveCustomerData(credential.user.uid, newCustomer);
        setCustomer(newCustomer);
      }

      setAuthModal(false);
    } catch (error) {
      console.error("Erro login/cadastro:", error);
      setAuthError("Não foi possível continuar. Confira os dados informados.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function buscarCepEndereco() {
    const cleanCep = onlyNumbers(addressForm.cep);

    if (cleanCep.length !== 8) {
      alert("Digite um CEP válido com 8 números.");
      return;
    }

    setBuscandoCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data?.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setAddressForm((prev) => ({
        ...prev,
        cep: cleanCep,
        address: data.logradouro || "",
        district: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleSaveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) {
      openAuthModal("login");
      return;
    }

    const cleanCep = onlyNumbers(addressForm.cep);

    if (cleanCep.length !== 8) {
      alert("Digite um CEP válido com 8 números.");
      return;
    }

    if (
      !addressForm.name ||
      !addressForm.recipientName ||
      !addressForm.phone ||
      !addressForm.address ||
      !addressForm.number ||
      !addressForm.district ||
      !addressForm.city ||
      !addressForm.state
    ) {
      alert("Preencha todos os campos obrigatórios do endereço.");
      return;
    }

    setSavingAddress(true);

    try {
      await saveCustomerAddress(user.uid, {
        ...addressForm,
        cep: cleanCep,
        state: addressForm.state.toUpperCase(),
        isDefault: addresses.length === 0 || addressForm.isDefault,
      });

      await loadAddresses(user.uid);

      setSelectedAddressId("");
      setCepDestino("");
      setSelectedShipping(null);
      setShippingOptions([]);
      setAddressForm(emptyAddressForm);
      setShowAddressForm(false);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
      alert("Erro ao salvar endereço.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function calcularFretePorCep(cleanCep: string) {
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

      const options: ShippingOption[] = Array.isArray(data.options)
        ? data.options
        : [];

      if (!options.length) {
        alert("Nenhuma opção de frete encontrada para este CEP.");
        return;
      }

      const sortedOptions = [...options].sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      );

      setShippingOptions(sortedOptions);
      setSelectedShipping(null);
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      alert("Erro ao calcular frete.");
    } finally {
      setCalculandoFrete(false);
    }
  }

  async function calcularFrete() {
    const cleanCep = onlyNumbers(cepDestino);

    if (!cleanCep || !items.length) return;

    if (cleanCep.length !== 8) {
      alert("Digite um CEP válido com 8 números.");
      return;
    }

    setCepDestino(cleanCep);
    setSelectedAddressId("");
    await calcularFretePorCep(cleanCep);
  }

  async function finalizar() {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!items.length) return;

    const cleanDocument = onlyNumbers(customer.document || "");

    if (cleanDocument.length !== 11) {
      alert(
        "Para finalizar, informe seu CPF em Minha Conta > Meus dados ou atualize seu cadastro.",
      );
      return;
    }

    const invalidStockItem = items.find(
      (item) => Number(item.quantity || 1) > Number(item.stock || 0),
    );

    if (invalidStockItem) {
      alert(
        `O produto "${invalidStockItem.name}" tem apenas ${invalidStockItem.stock} unidade(s) em estoque.`,
      );
      return;
    }

    if (deliveryType === "envio" && !selectedAddress) {
      alert("Para finalizar, selecione ou cadastre o endereço completo.");
      return;
    }

    if (deliveryType === "envio" && !selectedShipping) {
      alert("Calcule e selecione uma opção de frete antes de finalizar.");
      return;
    }

    setLoading(true);

    try {
      const finalCustomer: CustomerDataWithDocument =
        deliveryType === "envio" && selectedAddress
          ? {
              name: selectedAddress.recipientName || customer.name,
              email: user.email || customer.email,
              phone: selectedAddress.phone || customer.phone,
              document: cleanDocument,
              cep: selectedAddress.cep,
              address: selectedAddress.address,
              number: selectedAddress.number,
              complement: selectedAddress.complement,
              district: selectedAddress.district,
              city: selectedAddress.city,
              state: selectedAddress.state,
            }
          : {
              ...emptyCustomer,
              ...customer,
              document: cleanDocument,
              email: user.email || customer.email,
            };

      await saveCustomerData(user.uid, finalCustomer);

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
        shippingAddress:
          deliveryType === "envio" ? selectedAddress || null : null,
        items,
        subtotal,
        deliveryType,
        deliveryPrice,
        shippingOption: selectedShipping,
        paymentUrl: payment.init_point || "",
        mercadoPagoPreferenceId: payment.id || "",
      });

      clearCart();

      if (payment.init_point) {
        window.location.href = payment.init_point;
      } else {
        router.push(`/obrigado?pedido=${saleId}`);
      }
    } catch (error) {
      console.error("Erro ao finalizar compra:", error);
      alert("Erro ao finalizar compra.");
    } finally {
      setLoading(false);
    }
  }

  const showShippingCalculator = deliveryType === "envio";

  return (
    <>
      <main className="container py-5">
        <h1 className="fw-bold mb-2">Carrinho</h1>

        <p style={{ color: theme.brownSoft }}>
          Calcule o frete sem cadastro. Para finalizar, escolha um endereço
          completo e mantenha seu CPF salvo em Meus dados.
        </p>

        <div className="row g-4">
          <div className="col-lg-7">
            {items.map((item) => {
              const quantity = Number(item.quantity || 1);
              const stock = Math.max(Number(item.stock || 0), 0);
              const maxReached = quantity >= stock;

              return (
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

                    <p className="mb-1">
                      {[item.size, item.color].filter(Boolean).join(" • ")}
                    </p>

                    <p className="mb-1" style={{ color: theme.brownSoft }}>
                      Estoque disponível: <strong>{stock}</strong>
                    </p>

                    <strong>{formatMoney(item.price)}</strong>

                    <div className="d-flex align-items-center gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={quantity <= 1}
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                        style={{ borderRadius: 999 }}
                      >
                        <Minus size={15} />
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
                        style={{ width: 80, borderRadius: 999 }}
                      />

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={stock <= 0 || maxReached}
                        onClick={() => updateQuantity(item.id, quantity + 1)}
                        style={{ borderRadius: 999 }}
                      >
                        <Plus size={15} />
                      </button>

                      {maxReached && stock > 0 && (
                        <small style={{ color: theme.brownSoft }}>
                          máximo em estoque
                        </small>
                      )}
                    </div>

                    <p className="mb-0 mt-2">
                      Subtotal do item:{" "}
                      <strong>
                        {formatMoney(Number(item.price || 0) * quantity)}
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger h-25"
                    onClick={() => removeFromCart(item.id)}
                    style={{ borderRadius: 999 }}
                  >
                    <Trash2 size={15} className="me-1" />
                    Remover
                  </button>
                </div>
              );
            })}

            {!items.length && (
              <div className="alert alert-warning">
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
              <h4 className="fw-bold">Entrega</h4>

              <select
                className="form-select mb-3"
                value={deliveryType}
                onChange={(e) =>
                  setDeliveryType(e.target.value as DeliveryType)
                }
              >
                <option value="envio">
                  Envio pelos Correios/transportadora
                </option>
                <option value="retirada">
                  Retirada em Realengo/RJ - grátis
                </option>
                <option value="combinar_whatsapp">
                  Uber / 99 Entrega - consultar WhatsApp
                </option>
              </select>

              {showShippingCalculator && (
                <div
                  className="p-3 mb-3"
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <label className="form-label fw-semibold">
                    Consultar frete por CEP
                  </label>

                  <div className="input-group">
                    <input
                      className="form-control"
                      placeholder="Digite o CEP"
                      value={cepDestino}
                      onChange={(e) => {
                        setCepDestino(e.target.value);
                        setSelectedAddressId("");
                        setSelectedShipping(null);
                        setShippingOptions([]);
                      }}
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
                    Esse CEP é somente para consulta. O endereço final será
                    escolhido abaixo.
                  </small>

                  {!selectedAddressId && renderShippingOptions()}
                </div>
              )}

              {deliveryType === "envio" && user && (
                <div className="mb-3">
                  <h5 className="fw-bold">Endereço para finalizar</h5>

                  {loadingCustomer ? (
                    <p>Carregando endereços...</p>
                  ) : (
                    <>
                      {addresses.length > 0 && (
                        <>
                          <select
                            className="form-select mb-2"
                            value={selectedAddressId}
                            onChange={(e) =>
                              handleSelectAddress(e.target.value)
                            }
                          >
                            <option value="">Selecione um endereço</option>

                            {addresses.map((address) => (
                              <option key={address.id} value={address.id}>
                                {address.name} - {address.address},{" "}
                                {address.number}
                              </option>
                            ))}
                          </select>

                          {selectedAddressId && renderShippingOptions()}

                          {selectedAddress && (
                            <div
                              className="p-3 mb-3"
                              style={{
                                background: "#fff",
                                borderRadius: 18,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              <div className="d-flex gap-2 align-items-center">
                                <Home size={18} />
                                <strong>{selectedAddress.name}</strong>

                                {selectedAddress.isDefault && (
                                  <span className="badge bg-success">
                                    Principal
                                  </span>
                                )}
                              </div>

                              <div style={{ color: theme.brownSoft }}>
                                {selectedAddress.recipientName} •{" "}
                                {selectedAddress.phone}
                              </div>

                              <div>
                                {selectedAddress.address},{" "}
                                {selectedAddress.number}
                                {selectedAddress.complement
                                  ? ` - ${selectedAddress.complement}`
                                  : ""}
                              </div>

                              <div style={{ color: theme.brownSoft }}>
                                {selectedAddress.district} -{" "}
                                {selectedAddress.city}/{selectedAddress.state} •
                                CEP {selectedAddress.cep}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!selectedAddress && (
                        <div
                          className="alert alert-warning mt-3 mb-2"
                          style={{
                            borderRadius: 18,
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          <strong>Endereço obrigatório:</strong> selecione ou
                          cadastre um endereço completo para finalizar.
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 mb-3"
                        style={{ borderRadius: 999 }}
                        onClick={() => setShowAddressForm(true)}
                      >
                        <MapPin size={16} className="me-1" />+ Cadastrar novo
                        endereço
                      </button>
                    </>
                  )}
                </div>
              )}

              {deliveryType === "envio" && !user && (
                <div
                  className="alert alert-warning mt-3 mb-2"
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <strong>Para finalizar:</strong> faça login ou crie uma conta.
                  <div className="d-grid gap-2 mt-3">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openAuthModal("login")}
                      style={{
                        background: theme.brown,
                        color: "#fff",
                        borderRadius: 999,
                      }}
                    >
                      Fazer login
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => openAuthModal("cadastro")}
                      style={{ borderRadius: 999 }}
                    >
                      Criar cadastro
                    </button>
                  </div>
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
                    O valor da entrega por Uber/99 será consultado pelo
                    WhatsApp.
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

              <button
                type="button"
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
            </div>
          </div>
        </div>
      </main>

      {showAddressForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: theme.ivory2,
              borderRadius: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              padding: 24,
              position: "relative",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAddressForm(false)}
              className="btn btn-outline-secondary"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 38,
                height: 38,
                borderRadius: "50%",
                padding: 0,
              }}
            >
              <X size={18} />
            </button>

            <h3 className="fw-bold mb-1">Novo endereço</h3>

            <form onSubmit={handleSaveAddress}>
              <input
                className="form-control mb-2"
                placeholder="Nome do endereço. Ex: Casa, Trabalho"
                value={addressForm.name}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                required
              />

              <input
                className="form-control mb-2"
                placeholder="Nome de quem recebe"
                value={addressForm.recipientName}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    recipientName: e.target.value,
                  }))
                }
                required
              />

              <input
                className="form-control mb-2"
                placeholder="Telefone/WhatsApp"
                value={addressForm.phone}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                required
              />

              <div className="input-group mb-2">
                <input
                  className="form-control"
                  placeholder="CEP"
                  value={addressForm.cep}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      cep: e.target.value,
                    }))
                  }
                  required
                />

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={buscarCepEndereco}
                  disabled={buscandoCep}
                >
                  {buscandoCep ? "Buscando..." : "Buscar CEP"}
                </button>
              </div>

              <input
                className="form-control mb-2"
                placeholder="Rua / Avenida"
                value={addressForm.address}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                required
              />

              <div className="row g-2">
                <div className="col-5">
                  <input
                    className="form-control mb-2"
                    placeholder="Número"
                    value={addressForm.number}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        number: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="col-7">
                  <input
                    className="form-control mb-2"
                    placeholder="Complemento"
                    value={addressForm.complement}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        complement: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <input
                className="form-control mb-2"
                placeholder="Bairro"
                value={addressForm.district}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    district: e.target.value,
                  }))
                }
                required
              />

              <div className="row g-2">
                <div className="col-8">
                  <input
                    className="form-control mb-2"
                    placeholder="Cidade"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="col-4">
                  <input
                    className="form-control mb-2"
                    placeholder="UF"
                    maxLength={2}
                    value={addressForm.state}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        state: e.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <label className="d-flex gap-2 align-items-center mb-3">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      isDefault: e.target.checked,
                    }))
                  }
                />
                Definir como endereço principal
              </label>

              <button
                type="submit"
                disabled={savingAddress}
                className="btn w-100"
                style={{
                  background: theme.brown,
                  color: "#fff",
                  borderRadius: 999,
                }}
              >
                <Save size={16} className="me-1" />
                {savingAddress ? "Salvando..." : "Salvar endereço"}
              </button>
            </form>
          </div>
        </div>
      )}

      {authModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.55)",
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
              background: theme.ivory2,
              borderRadius: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              padding: 24,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setAuthModal(false)}
              className="btn btn-outline-secondary"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 38,
                height: 38,
                borderRadius: "50%",
                padding: 0,
              }}
            >
              <X size={18} />
            </button>

            <h3 className="fw-bold mb-1">
              {authMode === "login" ? "Entrar na conta" : "Criar cadastro"}
            </h3>

            {authError && <div className="alert alert-danger">{authError}</div>}

            <form onSubmit={submitAuth}>
              {authMode === "cadastro" && (
                <>
                  <label className="form-label">Nome completo</label>
                  <input
                    className="form-control mb-3"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required
                  />

                  <label className="form-label">CPF</label>
                  <input
                    className="form-control mb-3"
                    value={formatCpf(authDocument)}
                    onChange={(e) =>
                      setAuthDocument(onlyNumbers(e.target.value).slice(0, 11))
                    }
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                  />

                  <label className="form-label">Telefone / WhatsApp</label>
                  <input
                    className="form-control mb-3"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    required
                  />
                </>
              )}

              <label className="form-label">E-mail</label>
              <input
                className="form-control mb-3"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />

              <label className="form-label">Senha</label>
              <div className="input-group mb-3">
                <input
                  className="form-control"
                  type={showPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
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
                disabled={authLoading}
                className="btn w-100"
                style={{
                  background: theme.brown,
                  color: "#fff",
                  borderRadius: 999,
                }}
              >
                {authLoading
                  ? "Aguarde..."
                  : authMode === "login"
                    ? "Entrar e continuar"
                    : "Criar cadastro e continuar"}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-link w-100 mt-3"
              onClick={() => {
                setAuthError("");
                setAuthPassword("");
                setAuthMode(authMode === "login" ? "cadastro" : "login");
              }}
              style={{ color: theme.brown }}
            >
              {authMode === "login"
                ? "Ainda não tenho cadastro"
                : "Já tenho cadastro"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function CarrinhoPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <CarrinhoContent />
    </Suspense>
  );
}
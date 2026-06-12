"use client";

import { Suspense, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  EyeOff,
  Home,
  MapPin,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";

import {
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerData,
  getUserSales,
  requestCancelSale,
  saveCustomerAddress,
  saveCustomerData,
} from "@/lib/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { CustomerAddress, CustomerData, Sale } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
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

function MinhaContaContent() {
  const { user, loading, login, register, resetPassword, logout } = useAuth();

  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [activeTab, setActiveTab] = useState<
    "compras" | "dados" | "enderecos"
  >("compras");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customer, setCustomer] =
    useState<CustomerDataWithDocument>(emptyCustomer);
  const [sales, setSales] = useState<Sale[]>([]);
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [erro, setErro] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    setActiveTab("compras");

    getUserSales(user.uid).then(setSales);
    getCustomerAddresses(user.uid).then(setAddresses);

    getCustomerData(user.uid).then((data) => {
      const customerData = data as CustomerDataWithDocument | null;

      setCustomer({
        ...emptyCustomer,
        ...customerData,
        email: customerData?.email || user.email || "",
      });
    });
  }, [user]);

  async function reloadAddresses() {
    if (!user) return;

    const list = await getCustomerAddresses(user.uid);
    setAddresses(list);
  }

  async function submitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErro("");
    setSuccess("");
    setSaving(true);

    try {
      if (mode === "login") {
        await login(customer.email.trim(), password);
      } else {
        const cleanDocument = onlyNumbers(customer.document || "");

        if (cleanDocument.length !== 11) {
          setErro("Digite um CPF válido com 11 números.");
          return;
        }

        const credential = await register(customer.email.trim(), password);

        await saveCustomerData(credential.user.uid, {
          ...emptyCustomer,
          ...customer,
          document: cleanDocument,
          email: customer.email.trim(),
        });

        setCustomer((prev) => ({
          ...prev,
          document: cleanDocument,
        }));
      }
    } catch {
      setErro("Não foi possível continuar. Confira os dados informados.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    setErro("");
    setSuccess("");

    if (!customer.email.trim()) {
      setErro("Digite seu e-mail para recuperar a senha.");
      return;
    }

    try {
      await resetPassword(customer.email.trim());
      setSuccess("Enviamos um link de recuperação para seu e-mail.");
    } catch {
      setErro("Não foi possível enviar o e-mail de recuperação.");
    }
  }

  async function saveData() {
    if (!user) return;

    const cleanDocument = onlyNumbers(customer.document || "");

    if (cleanDocument && cleanDocument.length !== 11) {
      setErro("Digite um CPF válido com 11 números.");
      return;
    }

    setSaving(true);
    setSuccess("");
    setErro("");

    try {
      await saveCustomerData(user.uid, {
        ...emptyCustomer,
        ...customer,
        document: cleanDocument,
        email: user.email || customer.email,
      });

      setCustomer((prev) => ({
        ...prev,
        document: cleanDocument,
      }));

      setSuccess("Dados salvos com sucesso.");
    } catch {
      setErro("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  }

  async function buscarCepEndereco() {
    const cleanCep = onlyNumbers(addressForm.cep);

    if (cleanCep.length !== 8) {
      setErro("Digite um CEP válido com 8 números.");
      return;
    }

    setBuscandoCep(true);
    setErro("");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data?.erro) {
        setErro("CEP não encontrado.");
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
    } catch {
      setErro("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function openNewAddressForm() {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setShowAddressForm(true);
    setErro("");
    setSuccess("");
  }

  function openEditAddressForm(address: CustomerAddress) {
    setEditingAddressId(address.id || null);
    setAddressForm({
      name: address.name || "",
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      cep: address.cep || "",
      address: address.address || "",
      number: address.number || "",
      complement: address.complement || "",
      district: address.district || "",
      city: address.city || "",
      state: address.state || "",
      isDefault: Boolean(address.isDefault),
    });
    setShowAddressForm(true);
    setErro("");
    setSuccess("");
  }

  async function handleSaveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    const cleanCep = onlyNumbers(addressForm.cep);

    if (cleanCep.length !== 8) {
      setErro("Digite um CEP válido com 8 números.");
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
      setErro("Preencha todos os campos obrigatórios do endereço.");
      return;
    }

    setSaving(true);
    setErro("");
    setSuccess("");

    try {
      const payload = {
        ...addressForm,
        cep: cleanCep,
        state: addressForm.state.toUpperCase(),
        isDefault: addresses.length === 0 || addressForm.isDefault,
      };

      if (editingAddressId) {
        await saveCustomerAddress(user.uid, payload, editingAddressId);
        setSuccess("Endereço atualizado com sucesso.");
      } else {
        await saveCustomerAddress(user.uid, payload);
        setSuccess("Endereço cadastrado com sucesso.");
      }

      await reloadAddresses();

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(emptyAddressForm);
    } catch {
      setErro("Erro ao salvar endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAddress(addressId?: string) {
    if (!user || !addressId) return;

    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este endereço?",
    );

    if (!confirmDelete) return;

    setSaving(true);
    setErro("");
    setSuccess("");

    try {
      await deleteCustomerAddress(user.uid, addressId);
      await reloadAddresses();
      setSuccess("Endereço excluído com sucesso.");
    } catch {
      setErro("Erro ao excluir endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelSale(id: string) {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;

    await requestCancelSale(id, reason);

    if (user) {
      setSales(await getUserSales(user.uid));
    }
  }

  if (loading) {
    return <main className="container py-5">Carregando...</main>;
  }

  if (!user) {
    return (
      <main className="container py-5" style={{ maxWidth: 720 }}>
        <div
          className="p-4"
          style={{
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
          }}
        >
          <h1 className="fw-bold mb-1">
            {mode === "login" ? "Login / Cadastro" : "Criar cadastro"}
          </h1>

          <p style={{ color: theme.brownSoft }}>
            {mode === "login"
              ? "Entre na sua conta ou crie seu cadastro no Defan Brechó."
              : "Preencha seus dados para criar sua conta."}
          </p>

          {erro && <div className="alert alert-danger">{erro}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={submitAuth}>
            {mode === "cadastro" && (
              <>
                <label className="form-label">Nome completo</label>
                <input
                  className="form-control mb-3"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  required
                />

                <label className="form-label">CPF</label>
                <input
                  className="form-control mb-3"
                  value={formatCpf(customer.document || "")}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      document: onlyNumbers(e.target.value).slice(0, 11),
                    })
                  }
                  required
                  minLength={14}
                  maxLength={14}
                  placeholder="000.000.000-00"
                />

                <label className="form-label">Telefone / WhatsApp</label>
                <input
                  className="form-control mb-3"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  required
                />
              </>
            )}

            <label className="form-label">E-mail</label>
            <input
              className="form-control mb-3"
              type="email"
              value={customer.email}
              onChange={(e) =>
                setCustomer({ ...customer, email: e.target.value })
              }
              required
            />

            <label className="form-label">Senha</label>
            <div className="input-group mb-2">
              <input
                className="form-control"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {mode === "login" && (
              <button
                type="button"
                onClick={handleResetPassword}
                className="btn btn-link p-0 mb-3"
                style={{ color: theme.brown }}
              >
                Esqueci minha senha
              </button>
            )}

            <button
              type="submit"
              className="btn w-100 mt-2"
              disabled={saving}
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
              }}
            >
              {saving
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar cadastro"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-link w-100 mt-3"
            onClick={() => {
              setErro("");
              setSuccess("");
              setPassword("");
              setMode(mode === "login" ? "cadastro" : "login");
            }}
            style={{ color: theme.brown }}
          >
            {mode === "login"
              ? "Ainda não tenho cadastro"
              : "Já tenho cadastro"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-5">
      <div className="text-center mb-4">
        <h1 className="fw-bold">Minha conta</h1>

        <p style={{ color: theme.brownSoft }}>
          Acompanhe suas compras, dados e endereços de envio.
        </p>

        <div
          className="d-inline-flex flex-wrap gap-2 p-2 mt-2 justify-content-center"
          style={{
            background: theme.ivory2,
            borderRadius: 999,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadow,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("compras")}
            className="btn"
            style={{
              background: activeTab === "compras" ? theme.brown : "transparent",
              color: activeTab === "compras" ? "#fff" : theme.brownDark,
              borderRadius: 999,
              padding: "8px 22px",
              fontWeight: 600,
            }}
          >
            <ShoppingBag size={16} className="me-1" />
            Minhas compras
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("enderecos")}
            className="btn"
            style={{
              background:
                activeTab === "enderecos" ? theme.brown : "transparent",
              color: activeTab === "enderecos" ? "#fff" : theme.brownDark,
              borderRadius: 999,
              padding: "8px 22px",
              fontWeight: 600,
            }}
          >
            <MapPin size={16} className="me-1" />
            Endereços de envio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dados")}
            className="btn"
            style={{
              background: activeTab === "dados" ? theme.brown : "transparent",
              color: activeTab === "dados" ? "#fff" : theme.brownDark,
              borderRadius: 999,
              padding: "8px 22px",
              fontWeight: 600,
            }}
          >
            <User size={16} className="me-1" />
            Meus dados
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === "compras" && (
        <section
          className="mx-auto"
          style={{
            maxWidth: 980,
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
            padding: 24,
          }}
        >
          <h4 className="fw-bold mb-3">Minhas compras</h4>

          {sales.map((sale) => {
            const isOpen = openSaleId === sale.id;
            const saleCustomer = sale.customer as CustomerDataWithDocument;

            return (
              <div
                key={sale.id}
                className="mb-3"
                style={{
                  background: "#fffaf2",
                  borderRadius: 24,
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
                    padding: 18,
                    cursor: "pointer",
                  }}
                >
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <strong>Pedido #{sale.id.slice(0, 8)}</strong>
                      <div style={{ color: theme.brownSoft, fontSize: 13 }}>
                        Clique para ver detalhes
                      </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-3">
                      <span>
                        Total: <strong>{formatMoney(sale.total)}</strong>
                      </span>

                      <span>
                        Entrega: <strong>{sale.deliveryType}</strong>
                      </span>

                      <span
                        className="badge"
                        style={{
                          background: theme.brown,
                          padding: "8px 10px",
                        }}
                      >
                        {statusLabel(sale.status)}
                      </span>

                      {isOpen ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      padding: 18,
                    }}
                  >
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>Pedido</small>
                        <p className="mb-0 fw-bold">#{sale.id}</p>
                      </div>

                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>Status</small>
                        <p className="mb-0 fw-bold">
                          {statusLabel(sale.status)}
                        </p>
                      </div>

                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>
                          Forma de entrega
                        </small>
                        <p className="mb-0 fw-bold">{sale.deliveryType}</p>
                      </div>

                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>
                          Subtotal
                        </small>
                        <p className="mb-0 fw-bold">
                          {formatMoney(sale.subtotal || 0)}
                        </p>
                      </div>

                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>
                          Entrega
                        </small>
                        <p className="mb-0 fw-bold">
                          {formatMoney(sale.deliveryPrice || 0)}
                        </p>
                      </div>

                      <div className="col-md-4">
                        <small style={{ color: theme.brownSoft }}>Total</small>
                        <p className="mb-0 fw-bold">
                          {formatMoney(sale.total || 0)}
                        </p>
                      </div>
                    </div>

                    <h6 className="fw-bold mb-2">Produtos da compra</h6>

                    <div className="d-grid gap-2 mb-3">
                      {sale.items.map((item) => (
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
                              width: 64,
                              height: 76,
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
                              {[item.size, item.color, item.category]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>

                            <div style={{ fontSize: 13 }}>
                              Quantidade: {item.quantity || 1}
                            </div>
                          </div>

                          <strong>{formatMoney(item.price || 0)}</strong>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-bold mb-2">Dados do cliente</h6>

                    <div
                      className="p-3 mb-3"
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <p className="mb-1">
                        <strong>Nome:</strong>{" "}
                        {saleCustomer?.name || "Não informado"}
                      </p>

                      <p className="mb-1">
                        <strong>CPF:</strong>{" "}
                        {saleCustomer?.document
                          ? formatCpf(saleCustomer.document)
                          : "Não informado"}
                      </p>

                      <p className="mb-1">
                        <strong>E-mail:</strong>{" "}
                        {saleCustomer?.email || "Não informado"}
                      </p>

                      <p className="mb-1">
                        <strong>WhatsApp:</strong>{" "}
                        {saleCustomer?.phone || "Não informado"}
                      </p>

                      <p className="mb-0">
                        <strong>Endereço:</strong>{" "}
                        {[
                          saleCustomer?.address,
                          saleCustomer?.number,
                          saleCustomer?.complement,
                          saleCustomer?.district,
                          saleCustomer?.city,
                          saleCustomer?.state,
                          saleCustomer?.cep,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Não informado"}
                      </p>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      {sale.paymentUrl &&
                        sale.status === "aguardando_pagamento" && (
                          <a
                            className="btn btn-sm"
                            href={sale.paymentUrl}
                            style={{
                              background: theme.brown,
                              color: "#fff",
                              borderRadius: 999,
                            }}
                          >
                            Pagar pedido
                          </a>
                        )}

                      {![
                        "cancelado",
                        "entregue",
                        "cancelamento_solicitado",
                      ].includes(sale.status) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelSale(sale.id);
                          }}
                          style={{ borderRadius: 999 }}
                        >
                          Solicitar cancelamento
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!sales.length && (
            <div className="alert alert-warning mb-0">
              Você ainda não tem compras.
            </div>
          )}
        </section>
      )}

      {activeTab === "enderecos" && (
        <section
          className="mx-auto"
          style={{
            maxWidth: 980,
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
            padding: 24,
          }}
        >
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h4 className="fw-bold mb-1">Endereços de envio</h4>
              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Cadastre, edite ou exclua seus endereços de entrega.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewAddressForm}
              className="btn"
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
              }}
            >
              <Plus size={16} className="me-1" />
              Novo endereço
            </button>
          </div>

          {addresses.length > 0 ? (
            <div className="row g-3">
              {addresses.map((address) => (
                <div className="col-md-6" key={address.id}>
                  <div
                    className="p-3 h-100"
                    style={{
                      background: "#fff",
                      borderRadius: 20,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <div className="d-flex justify-content-between gap-2 mb-2">
                      <div className="d-flex gap-2 align-items-center">
                        <Home size={18} />
                        <strong>{address.name}</strong>
                      </div>

                      {address.isDefault && (
                        <span className="badge bg-success">Principal</span>
                      )}
                    </div>

                    <p className="mb-1" style={{ color: theme.brownSoft }}>
                      {address.recipientName} • {address.phone}
                    </p>

                    <p className="mb-1">
                      {address.address}, {address.number}
                      {address.complement
                        ? ` - ${address.complement}`
                        : ""}
                    </p>

                    <p className="mb-3" style={{ color: theme.brownSoft }}>
                      {address.district} - {address.city}/{address.state} • CEP{" "}
                      {address.cep}
                    </p>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openEditAddressForm(address)}
                        style={{ borderRadius: 999 }}
                      >
                        <Edit size={14} className="me-1" />
                        Editar
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteAddress(address.id)}
                        style={{ borderRadius: 999 }}
                      >
                        <Trash2 size={14} className="me-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-warning mb-0">
              Nenhum endereço cadastrado.
            </div>
          )}
        </section>
      )}

      {activeTab === "dados" && (
        <section
          className="mx-auto"
          style={{
            maxWidth: 760,
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
            padding: 24,
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0">Meus dados</h4>

            <button
              type="button"
              onClick={logout}
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: 999 }}
            >
              Sair
            </button>
          </div>

          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Nome completo</label>
              <input
                className="form-control mb-2"
                value={customer.name || ""}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">CPF</label>
              <input
                className="form-control mb-2"
                value={formatCpf(customer.document || "")}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    document: onlyNumbers(e.target.value).slice(0, 11),
                  })
                }
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">E-mail</label>
              <input
                className="form-control mb-2"
                value={customer.email || ""}
                disabled
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Telefone/WhatsApp</label>
              <input
                className="form-control mb-2"
                value={customer.phone || ""}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    phone: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveData}
            disabled={saving}
            className="btn w-100 mt-3"
            style={{
              background: theme.brown,
              color: "#fff",
              borderRadius: 999,
            }}
          >
            {saving ? "Salvando..." : "Salvar dados"}
          </button>
        </section>
      )}

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
              onClick={() => {
                setShowAddressForm(false);
                setEditingAddressId(null);
                setAddressForm(emptyAddressForm);
              }}
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
              {editingAddressId ? "Editar endereço" : "Novo endereço"}
            </h3>

            <p style={{ color: theme.brownSoft }}>
              Digite o CEP e clique em buscar para preencher rua, bairro, cidade
              e UF automaticamente.
            </p>

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
                disabled={saving}
                className="btn w-100"
                style={{
                  background: theme.brown,
                  color: "#fff",
                  borderRadius: 999,
                }}
              >
                <Save size={16} className="me-1" />
                {saving
                  ? "Salvando..."
                  : editingAddressId
                    ? "Salvar alterações"
                    : "Salvar endereço"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function MinhaContaPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <MinhaContaContent />
    </Suspense>
  );
}
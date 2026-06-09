"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ShoppingBag, User } from "lucide-react";
import {
  getCustomerData,
  getUserSales,
  requestCancelSale,
  saveCustomerData,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerData, Sale } from "@/types";
import { formatMoney, statusLabel } from "@/lib/utils";
import { theme } from "@/lib/theme";

const emptyCustomer: CustomerData = {
  name: "",
  email: "",
  phone: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  city: "",
  state: "",
};

export default function MinhaContaPage() {
  const { user, loading, login, register, resetPassword, logout } = useAuth();

  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [activeTab, setActiveTab] = useState<"dados" | "compras">("dados");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [sales, setSales] = useState<Sale[]>([]);

  const [erro, setErro] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getUserSales(user.uid).then(setSales);

      getCustomerData(user.uid).then((data) => {
        setCustomer({
          ...emptyCustomer,
          ...data,
          email: data?.email || user.email || "",
        });
      });
    }
  }, [user]);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();

    setErro("");
    setSuccess("");
    setSaving(true);

    try {
      if (mode === "login") {
        await login(customer.email, password);
      } else {
        const credential = await register(customer.email, password);

        await saveCustomerData(credential.user.uid, {
          ...customer,
          email: customer.email,
        });
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

    setSaving(true);
    setSuccess("");
    setErro("");

    try {
      await saveCustomerData(user.uid, {
        ...customer,
        email: user.email || customer.email,
      });

      setSuccess("Dados salvos com sucesso.");
    } catch {
      setErro("Erro ao salvar dados.");
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
                onClick={() => setShowPassword(!showPassword)}
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

            {mode === "cadastro" && (
              <>
                <label className="form-label">CEP</label>
                <input
                  className="form-control mb-3"
                  value={customer.cep}
                  onChange={(e) =>
                    setCustomer({ ...customer, cep: e.target.value })
                  }
                />

                <label className="form-label">Endereço</label>
                <input
                  className="form-control mb-3"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />

                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label">Número</label>
                    <input
                      className="form-control mb-3"
                      value={customer.number}
                      onChange={(e) =>
                        setCustomer({ ...customer, number: e.target.value })
                      }
                    />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Complemento</label>
                    <input
                      className="form-control mb-3"
                      value={customer.complement}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          complement: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <label className="form-label">Cidade</label>
                <input
                  className="form-control mb-3"
                  value={customer.city}
                  onChange={(e) =>
                    setCustomer({ ...customer, city: e.target.value })
                  }
                />

                <label className="form-label">Estado</label>
                <input
                  className="form-control mb-3"
                  value={customer.state}
                  onChange={(e) =>
                    setCustomer({ ...customer, state: e.target.value })
                  }
                />
              </>
            )}

            <button
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
          Gerencie seus dados e acompanhe suas compras.
        </p>

        <div
          className="d-inline-flex gap-2 p-2 mt-2"
          style={{
            background: theme.ivory2,
            borderRadius: 999,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadow,
          }}
        >
          <button
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

          <button
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
        </div>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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
              onClick={logout}
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: 999 }}
            >
              Sair
            </button>
          </div>

          <div className="row g-2">
            {[
              ["name", "Nome completo"],
              ["email", "E-mail"],
              ["phone", "Telefone/WhatsApp"],
              ["cep", "CEP"],
              ["address", "Endereço"],
              ["number", "Número"],
              ["complement", "Complemento"],
              ["city", "Cidade"],
              ["state", "Estado"],
            ].map(([key, label]) => (
              <div
                className={
                  key === "address" || key === "complement"
                    ? "col-md-8"
                    : "col-md-4"
                }
                key={key}
              >
                <label className="form-label">{label}</label>
                <input
                  className="form-control mb-2"
                  value={customer[key as keyof CustomerData]}
                  disabled={key === "email"}
                  onChange={(e) =>
                    setCustomer({ ...customer, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <button
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

      {activeTab === "compras" && (
        <section
          className="mx-auto"
          style={{
            maxWidth: 900,
            background: theme.ivory2,
            borderRadius: 28,
            boxShadow: theme.shadow,
            padding: 24,
          }}
        >
          <h4 className="fw-bold mb-3">Minhas compras</h4>

          {sales.map((sale) => (
            <div
              key={sale.id}
              className="p-3 mb-3"
              style={{
                background: "#fffaf2",
                borderRadius: 24,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div className="d-flex justify-content-between">
                <strong>Pedido #{sale.id.slice(0, 6)}</strong>

                <span className="badge" style={{ background: theme.brown }}>
                  {statusLabel(sale.status)}
                </span>
              </div>

              <p className="mb-1 mt-2">
                Total: <strong>{formatMoney(sale.total)}</strong>
              </p>

              <p className="mb-1">Entrega: {sale.deliveryType}</p>

              {sale.trackingCode && (
                <p className="mb-1">
                  Rastreio: <strong>{sale.trackingCode}</strong>
                </p>
              )}

              <div className="small">
                {sale.items.map((item) => (
                  <span key={item.id} className="me-2">
                    {item.name}
                  </span>
                ))}
              </div>

              {sale.paymentUrl && sale.status === "aguardando_pagamento" && (
                <a
                  className="btn btn-sm mt-2 me-2"
                  href={sale.paymentUrl}
                  style={{
                    background: theme.brown,
                    color: "#fff",
                    borderRadius: 999,
                  }}
                >
                  Pagar
                </a>
              )}

              {!["cancelado", "entregue", "cancelamento_solicitado"].includes(
                sale.status,
              ) && (
                <button
                  className="btn btn-sm btn-outline-danger mt-2"
                  onClick={() => cancelSale(sale.id)}
                  style={{ borderRadius: 999 }}
                >
                  Solicitar cancelamento
                </button>
              )}
            </div>
          ))}

          {!sales.length && (
            <div className="alert alert-warning mb-0">
              Você ainda não tem compras.
            </div>
          )}
        </section>
      )}
    </main>
  );
}

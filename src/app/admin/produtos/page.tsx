"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  deleteProduct,
  getAllSales,
  getProducts,
  saveProduct,
} from "@/lib/firestore";

import { useAuth } from "@/contexts/AuthContext";
import { Product, Sale } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";
import ProductModal from "@/components/admin/ProductModal";

const ADMIN_EMAIL = "taisadefante@hotmail.com";

const productStatuses: Product["status"][] = [
  "disponivel",
  "reservado",
  "vendido",
  "arquivado",
];

function productStatusLabel(status: Product["status"]) {
  if (status === "disponivel") return "Disponível";
  if (status === "reservado") return "Reservado";
  if (status === "vendido") return "Vendido";
  if (status === "arquivado") return "Arquivado";

  return status;
}

function AdminProdutosContent() {
  const { user, loading, isAdmin, login } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [modal, setModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null,
  );

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [logging, setLogging] = useState(false);

  async function load() {
    try {
      const [productsList, salesList] = await Promise.all([
        getProducts(true),
        getAllSales(),
      ]);

      setProducts(productsList);
      setSales(salesList);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      alert("Erro ao carregar produtos.");
    }
  }

  useEffect(() => {
    if (user && isAdmin) {
      load();
    }
  }, [user, isAdmin]);

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setLogging(true);

    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
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

  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Excluir o produto "${product.name}"?`)) return;

    await deleteProduct(product.id);
    await load();
  }

  async function handleChangeStatus(product: Product, status: Product["status"]) {
    const previousProducts = products;

    setUpdatingProductId(product.id);

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? {
              ...item,
              status,
              updatedAt: Date.now(),
              soldAt: status === "vendido" ? Date.now() : item.soldAt || null,
            }
          : item,
      ),
    );

    try {
      const productToSave = {
        ...product,
        status,
        updatedAt: Date.now(),
        soldAt: status === "vendido" ? Date.now() : product.soldAt || null,
      };

      await saveProduct(productToSave, product.id);
      await load();
    } catch (error) {
      console.error("Erro ao atualizar status do produto:", error);
      setProducts(previousProducts);
      alert("Erro ao atualizar status do produto.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  function openNewProduct() {
    setEditingProduct(null);
    setModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setModal(true);
  }

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    const validSales = sales.filter((sale) => sale.status !== "cancelado");

    const monthSales = validSales.filter((sale) => {
      const date = new Date(sale.createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    return {
      active: products.filter((product) => product.status === "disponivel")
        .length,
      reserved: products.filter((product) => product.status === "reservado")
        .length,
      sold: products.filter((product) => product.status === "vendido").length,
      archived: products.filter((product) => product.status === "arquivado")
        .length,
      totalStock: products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0,
      ),
      revenue: monthSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
    };
  }, [products, sales]);

  if (loading) {
    return <main className="container-fluid px-3 px-lg-4 py-5">Carregando...</main>;
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
            <h1 className="fw-bold mb-1">Produtos</h1>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Cadastre, edite e altere o status direto na lista.
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={openNewProduct}
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
                padding: "9px 16px",
              }}
            >
              <Plus size={15} className="me-1" />
              Novo produto
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={load}
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
      </div>

      <div className="row g-3 mb-4">
        {[
          ["Disponíveis", stats.active],
          ["Reservados", stats.reserved],
          ["Vendidos", stats.sold],
          ["Arquivados", stats.archived],
          ["Estoque total", stats.totalStock],
          ["Faturamento mensal", formatMoney(stats.revenue)],
        ].map(([label, value]) => (
          <div className="col-6 col-xl-2" key={String(label)}>
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
          <h4 className="fw-bold mb-1">Lista de produtos</h4>

          <p className="mb-0" style={{ color: theme.brownSoft }}>
            Altere o status na própria linha sem abrir o cadastro.
          </p>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Tamanho</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: 110, textAlign: "center" }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const isUpdating = updatingProductId === product.id;

                return (
                  <tr key={product.id}>
                    <td style={{ minWidth: 260 }}>
                      <div className="d-flex align-items-center gap-2">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{
                              width: 58,
                              height: 58,
                              objectFit: "cover",
                              borderRadius: 14,
                              background: "#f3eadf",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 58,
                              height: 58,
                              borderRadius: 14,
                              background: "#eadfce",
                            }}
                          />
                        )}

                        <div>
                          <strong>{product.name}</strong>

                          {product.brand && (
                            <div
                              style={{
                                fontSize: 12,
                                color: theme.brownSoft,
                              }}
                            >
                              {product.brand}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: 12,
                              color: theme.brownSoft,
                            }}
                          >
                            ID: {product.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{product.category || "Não informado"}</td>
                    <td>{product.size || "Não informado"}</td>

                    <td>
                      <strong>{formatMoney(product.price)}</strong>
                    </td>

                    <td>
                      <strong>{Number(product.stock || 0)}</strong>
                    </td>

                    <td style={{ minWidth: 190 }}>
                      <select
                        className="form-select form-select-sm"
                        value={product.status}
                        disabled={isUpdating}
                        onChange={(event) =>
                          handleChangeStatus(
                            product,
                            event.target.value as Product["status"],
                          )
                        }
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${theme.border}`,
                          fontWeight: 700,
                          color: theme.brownDark,
                        }}
                      >
                        {productStatuses.map((status) => (
                          <option key={status} value={status}>
                            {productStatusLabel(status)}
                          </option>
                        ))}
                      </select>

                      {isUpdating && (
                        <small style={{ color: theme.brownSoft }}>
                          Salvando...
                        </small>
                      )}
                    </td>

                    <td>
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          title="Editar produto"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openEditProduct(product)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            padding: 0,
                          }}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          title="Excluir produto"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteProduct(product)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            padding: 0,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!products.length && (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    Nenhum produto cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setModal(false);
            setEditingProduct(null);
          }}
          onSaved={load}
        />
      )}
    </main>
  );
}

export default function AdminProdutosPage() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <AdminProdutosContent />
    </Suspense>
  );
}
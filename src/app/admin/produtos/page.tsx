"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteProduct, getAllSales, getProducts } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Product, Sale } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";
import ProductModal from "@/components/admin/ProductModal";

const ADMIN_EMAIL = "taisadefante@hotmail.com";

function AdminProdutosContent() {
  const { user, loading, isAdmin, login } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [modal, setModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    return <main className="container py-5">Carregando...</main>;
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
        <h1 className="fw-bold mb-1">Produtos</h1>
        <p className="mb-0" style={{ color: theme.brownSoft }}>
          Cadastre, edite e controle o estoque dos produtos.
        </p>
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
          <div className="col-md-4" key={String(label)}>
            <div
              className="p-4 h-100"
              style={{
                background: theme.ivory2,
                borderRadius: 24,
                boxShadow: theme.shadow,
                border: `1px solid ${theme.border}`,
              }}
            >
              <small style={{ color: theme.brownSoft }}>{label}</small>
              <h3 className="fw-bold mb-0">{value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div
        className="p-3"
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="fw-bold mb-0">Lista de produtos</h4>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm"
              onClick={openNewProduct}
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
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
              }}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Tamanho</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: 150 }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          style={{
                            width: 54,
                            height: 54,
                            objectFit: "cover",
                            borderRadius: 12,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 12,
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
                      </div>
                    </div>
                  </td>

                  <td>{product.category}</td>
                  <td>{product.size}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>
                    <strong>{Number(product.stock || 0)}</strong>
                  </td>
                  <td>{product.status}</td>

                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openEditProduct(product)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteProduct(product)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

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
      </div>

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
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
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
import FilterBar, { productMatchesFilters } from "@/components/FilterBar";

const ADMIN_EMAIL = "taisadefante@hotmail.com";
const PRODUCTS_PER_PAGE = 30;

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

function calculateProfit(product: Product) {
  const costPrice = Number(product.costPrice || 0);
  const salePrice = Number(product.price || 0);
  return salePrice - costPrice;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,00%";
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
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

  const [imageModal, setImageModal] = useState<{
    src: string;
    name: string;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setImageModal(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  async function handleDownloadImage(src: string, name: string) {
    try {
      const response = await fetch(src, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${safeFileName(name || "produto")}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao salvar imagem:", error);

      const link = document.createElement("a");
      link.href = src;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
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

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      productMatchesFilters(product, search, filters),
    );
  }, [products, search, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;

    return filteredProducts.slice(start, end);
  }, [filteredProducts, page]);

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    const validSales = sales.filter((sale) => sale.status !== "cancelado");

    const monthSales = validSales.filter((sale) => {
      const date = new Date(sale.createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const totalStock = products.reduce(
      (sum, product) => sum + Number(product.stock || 0),
      0,
    );

    const stockValue = products.reduce((sum, product) => {
      return sum + Number(product.price || 0) * Number(product.stock || 0);
    }, 0);

    const stockCostValue = products.reduce((sum, product) => {
      return sum + Number(product.costPrice || 0) * Number(product.stock || 0);
    }, 0);

    const potentialProfit = stockValue - stockCostValue;

    const availableStockValue = products
      .filter((product) => product.status === "disponivel")
      .reduce((sum, product) => {
        return sum + Number(product.price || 0) * Number(product.stock || 0);
      }, 0);

    const availableStockCostValue = products
      .filter((product) => product.status === "disponivel")
      .reduce((sum, product) => {
        return sum + Number(product.costPrice || 0) * Number(product.stock || 0);
      }, 0);

    const availableProfit = availableStockValue - availableStockCostValue;

    const averageMargin =
      stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0;

    return {
      active: products.filter((product) => product.status === "disponivel")
        .length,
      reserved: products.filter((product) => product.status === "reservado")
        .length,
      sold: products.filter((product) => product.status === "vendido").length,
      archived: products.filter((product) => product.status === "arquivado")
        .length,
      totalStock,
      stockValue,
      stockCostValue,
      potentialProfit,
      availableStockValue,
      availableProfit,
      averageMargin,
      revenue: monthSales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0,
      ),
    };
  }, [products, sales]);

  if (loading) {
    return (
      <main className="container-fluid px-3 px-lg-4 py-5">Carregando...</main>
    );
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
              Cadastre, edite, acompanhe custo, venda, lucro e margem.
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
          ["Valor venda estoque", formatMoney(stats.stockValue)],
          ["Valor custo estoque", formatMoney(stats.stockCostValue)],
          ["Lucro potencial", formatMoney(stats.potentialProfit)],
          ["Valor disponível", formatMoney(stats.availableStockValue)],
          ["Lucro disponível", formatMoney(stats.availableProfit)],
          ["Margem média", formatPercent(stats.averageMargin)],
          ["Faturamento mensal", formatMoney(stats.revenue)],
        ].map(([label, value]) => (
          <div className="col-6 col-md-4 col-xl-3" key={String(label)}>
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

      <FilterBar
        products={products}
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
      />

      <section
        style={{
          background: theme.ivory2,
          borderRadius: 24,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
          overflow: "hidden",
        }}
      >
        <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h4 className="fw-bold mb-1">Lista de produtos</h4>

            <p className="mb-0" style={{ color: theme.brownSoft }}>
              Exibindo {paginatedProducts.length} de {filteredProducts.length}{" "}
              produto(s). Página {page} de {totalPages}.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Subtipo</th>
                <th>Tamanho / Idade</th>
                <th>Sexo</th>
                <th>Custo</th>
                <th>Venda</th>
                <th>Lucro</th>
                <th>Margem</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: 110, textAlign: "center" }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {paginatedProducts.map((product) => {
                const isUpdating = updatingProductId === product.id;
                const costPrice = Number(product.costPrice || 0);
                const salePrice = Number(product.price || 0);
                const profit = calculateProfit(product);
                const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
                const firstImage = product.images?.[0];

                return (
                  <tr key={product.id}>
                    <td style={{ minWidth: 260 }}>
                      <div className="d-flex align-items-center gap-2">
                        {firstImage ? (
                          <button
                            type="button"
                            title="Abrir imagem"
                            onClick={() =>
                              setImageModal({
                                src: firstImage,
                                name: product.name,
                              })
                            }
                            style={{
                              width: 58,
                              height: 58,
                              border: 0,
                              padding: 0,
                              borderRadius: 14,
                              background: "transparent",
                              cursor: "zoom-in",
                              overflow: "hidden",
                            }}
                          >
                            <img
                              src={firstImage}
                              alt={product.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                background: "#f3eadf",
                                display: "block",
                              }}
                            />
                          </button>
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
                    <td>{product.type || "Não informado"}</td>
                    <td>{product.subtype || "Não informado"}</td>
                    <td>{product.size || product.age || "Não informado"}</td>
                    <td>{product.gender || "Não informado"}</td>

                    <td>{formatMoney(costPrice)}</td>

                    <td>
                      <strong>{formatMoney(salePrice)}</strong>
                    </td>

                    <td>
                      <strong
                        style={{
                          color: profit >= 0 ? "#198754" : "#dc3545",
                        }}
                      >
                        {formatMoney(profit)}
                      </strong>
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

              {!paginatedProducts.length && (
                <tr>
                  <td colSpan={13} className="text-center py-4">
                    Nenhum produto encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > PRODUCTS_PER_PAGE && (
          <div className="p-3 border-top d-flex flex-wrap justify-content-center align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              style={{ borderRadius: 999 }}
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;

              return (
                <button
                  type="button"
                  key={pageNumber}
                  className="btn btn-sm"
                  onClick={() => setPage(pageNumber)}
                  style={{
                    borderRadius: 999,
                    minWidth: 38,
                    background:
                      pageNumber === page ? theme.brown : "transparent",
                    color: pageNumber === page ? "#fff" : theme.brown,
                    border: `1px solid ${theme.brown}`,
                    fontWeight: 700,
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page === totalPages}
              onClick={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
              style={{ borderRadius: 999 }}
            >
              Próximo
            </button>
          </div>
        )}
      </section>

      {imageModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setImageModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(980px, 100%)",
              maxHeight: "92vh",
              background: theme.ivory2,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
              border: `1px solid ${theme.border}`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="d-flex align-items-center justify-content-between gap-2"
              style={{
                padding: "12px 14px",
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <strong
                style={{
                  color: theme.brownDark,
                  fontSize: 15,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {imageModal.name}
              </strong>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    handleDownloadImage(imageModal.src, imageModal.name)
                  }
                  style={{
                    background: theme.brown,
                    color: "#fff",
                    borderRadius: 999,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Download size={15} />
                  Salvar
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setImageModal(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    padding: 0,
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 14,
                background: "#120f0c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
              }}
            >
              <img
                src={imageModal.src}
                alt={imageModal.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "78vh",
                  objectFit: "contain",
                  borderRadius: 16,
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      )}

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
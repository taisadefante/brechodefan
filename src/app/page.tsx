"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ShoppingBag, Sparkles } from "lucide-react";

import { getProducts } from "@/lib/firestore";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import ProductQuickViewModal from "@/components/ProductQuickViewModal";
import FilterBar from "@/components/FilterBar";
import { normalizeText } from "@/lib/utils";
import { theme } from "@/lib/theme";

const WHATSAPP_URL =
  "https://wa.me/5521988359825?text=Olá! Vim pelo site Defan Brechó.";

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    getProducts(true).then((list) => {
      setProducts(
        list.filter(
          (p) => p.status === "disponivel" || p.status === "reservado",
        ),
      );
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const text = normalizeText(
        `${p.name} ${p.description} ${p.category} ${p.color} ${p.size} ${p.age} ${p.gender} ${p.brand}`,
      );

      const okSearch = !search || text.includes(normalizeText(search));

      const okFilters = Object.entries(filters).every(
        ([key, value]) =>
          !value || String(p[key as keyof Product] || "") === value,
      );

      return okSearch && okFilters;
    });
  }, [products, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginatedProducts = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <main>
      <section
        style={{
          background: `linear-gradient(135deg, ${theme.brownDark}, ${theme.brown})`,
          color: theme.ivory,
          padding: "80px 0",
        }}
      >
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <span
                className="badge mb-3"
                style={{
                  background: "rgba(255,255,255,.16)",
                  color: theme.ivory,
                  borderRadius: 999,
                  padding: "9px 14px",
                }}
              >
                <Sparkles size={14} className="me-1" />
                Peças únicas selecionadas
              </span>

              <h1 className="display-4 fw-bold">Defan Brechó</h1>

              <p className="lead" style={{ maxWidth: 650 }}>
                Moda circular com curadoria, peças únicas e compra simples.
                Escolha sua peça, adicione ao carrinho e finalize com segurança.
              </p>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <a
                  href="#produtos"
                  className="btn btn-lg"
                  style={{
                    background: theme.ivory,
                    color: theme.brownDark,
                    borderRadius: 999,
                  }}
                >
                  <ShoppingBag size={18} className="me-2" />
                  Ver produtos
                </a>

                <span
                  className="btn btn-lg"
                  style={{
                    background: "rgba(255,255,255,.12)",
                    color: theme.ivory,
                    borderRadius: 999,
                  }}
                >
                  <MapPin size={18} className="me-2" />
                  Retirada em Realengo/RJ
                </span>
              </div>
            </div>

            <div className="col-lg-5">
              <div
                style={{
                  minHeight: 380,
                  borderRadius: 34,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,.25)",
                  border: "1px solid rgba(255,255,255,.18)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,244,225,.78))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 38,
                }}
              >
                <Image
                  src="/logo-defan-brecho.png"
                  alt="Defan Brechó"
                  width={420}
                  height={260}
                  priority
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    height: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 18px 24px rgba(92, 54, 34, .20))",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produtos" className="container py-5">
        <div className="mb-4">
          <h2 className="fw-bold">Produtos disponíveis</h2>
          <p style={{ color: theme.brownSoft }}>
            Filtre por categoria, tamanho, sexo, idade, cor e estado da peça.
          </p>
        </div>

        <FilterBar
          products={products}
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilters={setFilters}
        />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <p className="mb-0" style={{ color: theme.brownSoft }}>
            {filtered.length} produto(s) encontrado(s)
          </p>

          <p className="mb-0" style={{ color: theme.brownSoft }}>
            Página {page} de {totalPages}
          </p>
        </div>

        <div className="row g-4">
          {paginatedProducts.map((product) => (
            <div className="col-md-6 col-lg-4" key={product.id}>
              <ProductCard
                product={product}
                onView={() => setSelectedProduct(product)}
              />
            </div>
          ))}

          {!paginatedProducts.length && (
            <p>Nenhum produto encontrado com esses filtros.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="d-flex flex-wrap justify-content-center gap-2 mt-5">
            <button
              type="button"
              className="btn btn-outline-secondary"
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
                  className="btn"
                  onClick={() => setPage(pageNumber)}
                  style={{
                    borderRadius: 999,
                    background:
                      pageNumber === page ? theme.brown : "transparent",
                    color: pageNumber === page ? "#fff" : theme.brown,
                    border: `1px solid ${theme.brown}`,
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              style={{ borderRadius: 999 }}
            >
              Próxima
            </button>
          </div>
        )}
      </section>

      {selectedProduct && (
        <ProductQuickViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}

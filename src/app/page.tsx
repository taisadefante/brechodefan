"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Heart,
  MapPin,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";

import { getProducts } from "@/lib/firestore";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import ProductQuickViewModal from "@/components/ProductQuickViewModal";
import FilterBar, { productMatchesFilters } from "@/components/FilterBar";
import { normalizeText } from "@/lib/utils";
import { theme } from "@/lib/theme";

const ITEMS_PER_PAGE = 20;

function isProductAvailable(product: Product) {
  const status = normalizeText(String(product.status || ""));
  const stock = Number(product.stock || 0);

  return stock > 0 && status === "disponivel";
}

function HomeContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  async function loadProducts() {
    const list = await getProducts(true);
    setProducts(list.filter(isProductAvailable));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!isProductAvailable(p)) return false;

      return productMatchesFilters(p, search, filters);
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
          padding: "86px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="container position-relative">
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
                Brechó, desapego e moda circular
              </span>

              <h1 className="display-4 fw-bold mb-3">
                Peças selecionadas para você comprar bem, gastar menos e renovar
                o guarda-roupa.
              </h1>

              <p
                className="lead mb-4"
                style={{
                  maxWidth: 700,
                  color: "rgba(255,255,255,.88)",
                }}
              >
                No Defan Brechó você encontra roupas, acessórios e produtos de
                desapego em bom estado, com curadoria e preços especiais. Uma
                forma prática, econômica e consciente de comprar.
              </p>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <a
                  href="#produtos"
                  className="btn btn-lg fw-semibold"
                  style={{
                    background: theme.ivory,
                    color: theme.brownDark,
                    borderRadius: 999,
                    padding: "12px 22px",
                  }}
                >
                  <ShoppingBag size={18} className="me-2" />
                  Ver produtos disponíveis
                </a>

                <a
                  href="#como-funciona"
                  className="btn btn-lg fw-semibold"
                  style={{
                    background: "rgba(255,255,255,.12)",
                    color: theme.ivory,
                    borderRadius: 999,
                    padding: "12px 22px",
                    border: "1px solid rgba(255,255,255,.22)",
                  }}
                >
                  <Recycle size={18} className="me-2" />
                  Entenda como funciona
                </a>
              </div>
            </div>

            <div className="col-lg-5">
              <div
                style={{
                  minHeight: 390,
                  borderRadius: 34,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,.25)",
                  border: "1px solid rgba(255,255,255,.18)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,.95), rgba(255,244,225,.82))",
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

      <section id="como-funciona" className="container py-5">
        <div className="text-center mb-5">
          <span
            className="badge mb-3"
            style={{
              background: theme.ivory,
              color: theme.brown,
              borderRadius: 999,
              padding: "9px 14px",
            }}
          >
            Comprar de brechó vale a pena
          </span>

          <h2 className="fw-bold">
            Mais economia, mais estilo e consumo mais consciente.
          </h2>

          <p
            className="mx-auto mt-3"
            style={{
              maxWidth: 760,
              color: theme.brownSoft,
              fontSize: 17,
            }}
          >
            Você compra peças selecionadas, paga menos do que em lojas
            tradicionais e ainda contribui para que produtos em bom estado
            continuem sendo aproveitados.
          </p>
        </div>

        <div className="row g-4">
          {[
            {
              icon: <Tag size={26} />,
              title: "Preços especiais",
              text: "Produtos com valores acessíveis para você comprar melhor.",
            },
            {
              icon: <Heart size={26} />,
              title: "Curadoria com cuidado",
              text: "Peças escolhidas com atenção para facilitar sua compra.",
            },
            {
              icon: <ShieldCheck size={26} />,
              title: "Somente disponíveis",
              text: "A página exibe apenas produtos disponíveis em estoque.",
            },
            {
              icon: <Recycle size={26} />,
              title: "Moda circular",
              text: "Uma escolha mais consciente, econômica e sustentável.",
            },
          ].map((item) => (
            <div className="col-md-6 col-lg-3" key={item.title}>
              <div
                style={{
                  height: "100%",
                  background: "#fff",
                  borderRadius: 24,
                  padding: 24,
                  boxShadow: "0 14px 34px rgba(92, 54, 34, .08)",
                  border: "1px solid rgba(92, 54, 34, .08)",
                }}
              >
                <div
                  className="mb-3"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: theme.ivory,
                    color: theme.brown,
                  }}
                >
                  {item.icon}
                </div>

                <h3 className="h5 fw-bold">{item.title}</h3>

                <p className="mb-0" style={{ color: theme.brownSoft }}>
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="produtos" className="container py-5">
        <div className="mb-4">
          <h2 className="fw-bold">Escolha sua próxima peça</h2>

          <p style={{ color: theme.brownSoft, maxWidth: 760 }}>
            Use os filtros para encontrar produtos por categoria, marca,
            tipo, subtipo, marca, tamanho, sexo, idade, condição, preço e cor.
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
            <div className="col-12">
              <div
                style={{
                  background: theme.ivory,
                  borderRadius: 24,
                  padding: 30,
                  textAlign: "center",
                  color: theme.brownSoft,
                }}
              >
                Nenhum produto disponível foi encontrado com esses filtros.
              </div>
            </div>
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

      <section
        style={{
          background: `linear-gradient(135deg, ${theme.brown}, ${theme.brownDark})`,
          color: theme.ivory,
          padding: "54px 0",
        }}
      >
        <div className="container text-center">
          <MapPin size={28} className="mb-3" />

          <h2 className="fw-bold mb-3">Retirada em Realengo/RJ</h2>

          <p
            className="mx-auto mb-0"
            style={{
              maxWidth: 700,
              color: "rgba(255,255,255,.86)",
            }}
          >
            Finalize sua compra pelo site e combine a retirada de forma simples,
            prática e segura.
          </p>
        </div>
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

export default function Home() {
  return (
    <Suspense fallback={<main className="container py-5">Carregando...</main>}>
      <HomeContent />
    </Suspense>
  );
}
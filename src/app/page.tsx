"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Heart,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";

import { getProducts } from "@/lib/firestore";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import ProductQuickViewModal from "@/components/ProductQuickViewModal";
import FilterBar, { productMatchesFilters } from "@/components/FilterBar";
import { normalizeText } from "@/lib/utils";
import { theme } from "@/lib/theme";

const ITEMS_PER_PAGE = 24;

function isProductAvailable(product: Product) {
  const status = normalizeText(String(product.status || ""));
  const stock = Number(product.stock || 0);

  return stock > 0 && status === "disponivel";
}

function shuffleProducts(list: Product[]) {
  return [...list].sort(() => Math.random() - 0.5);
}

function WhatsAppOfficialIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.04 3C8.86 3 3.03 8.82 3.03 15.99c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75a12.9 12.9 0 0 0 6.36 1.67h.01c7.17 0 13-5.83 13-13S23.22 3 16.04 3Zm0 23.72h-.01c-1.95 0-3.86-.52-5.53-1.5l-.4-.24-3.96 1.04 1.06-3.86-.26-.4a10.68 10.68 0 0 1-1.64-5.77c0-5.94 4.83-10.77 10.77-10.77 2.88 0 5.58 1.12 7.61 3.16a10.7 10.7 0 0 1 3.15 7.61c0 5.94-4.83 10.77-10.77 10.77Zm5.9-8.06c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.48 4.84.77.33 1.36.52 1.83.67.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

function HomeContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  async function loadProducts() {
    const list = await getProducts(true);
    const availableProducts = list.filter(isProductAvailable);

    setProducts(shuffleProducts(availableProducts));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (!isProductAvailable(product)) return false;

      return productMatchesFilters(product, search, filters);
    });
  }, [products, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginatedProducts = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <main style={{ background: "#f8efe3" }}>
      <section
        style={{
          background: `linear-gradient(135deg, ${theme.brownDark}, ${theme.brown})`,
          color: theme.ivory,
          padding: "76px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="container-fluid px-3 px-md-5 position-relative"
          style={{ maxWidth: 1540 }}
        >
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
                  maxWidth: 760,
                  color: "rgba(255,255,255,.88)",
                }}
              >
                No Defan Brechó você encontra roupas, acessórios e produtos de
                desapego em bom estado, com curadoria e preços especiais.
              </p>

              <div className="d-flex flex-wrap gap-2">
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
                  Ver produtos
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
                  Como funciona
                </a>
              </div>
            </div>

            <div className="col-lg-5">
              <div
                style={{
                  minHeight: 320,
                  borderRadius: 30,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,.25)",
                  border: "1px solid rgba(255,255,255,.18)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,.95), rgba(255,244,225,.82))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 34,
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
                    maxWidth: 390,
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

      <section
        id="como-funciona"
        style={{
          background: "#fffaf3",
          borderBottom: "1px solid rgba(92,54,34,.08)",
        }}
      >
        <div
          className="container-fluid px-3 px-md-5 py-4"
          style={{ maxWidth: 1540 }}
        >
          <div className="row g-3">
            {[
              {
                icon: <Truck size={22} />,
                title: "Entrega flexível",
                text: "Escolha no carrinho: Correios, transportadora, retirada em Realengo ou Uber/99.",
              },
              {
                icon: <CreditCard size={22} />,
                title: "Pagamento Mercado Pago",
                text: "Pagamento seguro por cartão, PIX e saldo Mercado Pago.",
              },
              {
                icon: <WhatsAppOfficialIcon size={22} />,
                title: "Atendimento via WhatsApp",
                text: "Fale diretamente conosco para dúvidas, reservas e entregas.",
              },
              {
                icon: <PackageCheck size={22} />,
                title: "Produtos disponíveis",
                text: "A vitrine exibe apenas itens ativos e disponíveis em estoque.",
              },
            ].map((item) => (
              <div className="col-12 col-md-6 col-xl-3" key={item.title}>
                <div
                  style={{
                    height: "100%",
                    background: "#fff",
                    borderRadius: 18,
                    padding: "18px 20px",
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    boxShadow: "0 10px 28px rgba(92,54,34,.07)",
                    border: "1px solid rgba(92,54,34,.08)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 46,
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      background: theme.ivory,
                      color: theme.brown,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </div>

                  <div>
                    <h3 className="h6 fw-bold mb-1">{item.title}</h3>
                    <p
                      className="mb-0"
                      style={{
                        color: theme.brownSoft,
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div
          className="container-fluid px-3 px-md-5"
          style={{ maxWidth: 1540 }}
        >
          <div className="text-center mb-4">
            <span
              className="badge mb-3"
              style={{
                background: "#fff",
                color: theme.brown,
                borderRadius: 999,
                padding: "9px 14px",
              }}
            >
              Comprar de brechó vale a pena
            </span>

            <h2 className="fw-bold">
              Mais economia, mais estilo e consumo consciente.
            </h2>

            <p
              className="mx-auto mt-3"
              style={{
                maxWidth: 760,
                color: theme.brownSoft,
                fontSize: 16,
              }}
            >
              Peças selecionadas, preços acessíveis e uma forma mais inteligente
              de renovar o guarda-roupa.
            </p>
          </div>

          <div className="row g-3">
            {[
              {
                icon: <Tag size={24} />,
                title: "Preços especiais",
                text: "Produtos com valores acessíveis.",
              },
              {
                icon: <Heart size={24} />,
                title: "Curadoria com cuidado",
                text: "Peças escolhidas com atenção.",
              },
              {
                icon: <ShieldCheck size={24} />,
                title: "Compra prática",
                text: "Veja, escolha e finalize com facilidade.",
              },
              {
                icon: <Recycle size={24} />,
                title: "Moda circular",
                text: "Consumo mais consciente e sustentável.",
              },
            ].map((item) => (
              <div className="col-12 col-md-6 col-xl-3" key={item.title}>
                <div
                  style={{
                    height: "100%",
                    background: "#fff",
                    borderRadius: 20,
                    padding: 22,
                    boxShadow: "0 12px 30px rgba(92,54,34,.07)",
                    border: "1px solid rgba(92,54,34,.08)",
                  }}
                >
                  <div
                    className="mb-3"
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 17,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: theme.ivory,
                      color: theme.brown,
                    }}
                  >
                    {item.icon}
                  </div>

                  <h3 className="h6 fw-bold">{item.title}</h3>

                  <p
                    className="mb-0"
                    style={{ color: theme.brownSoft, fontSize: 14 }}
                  >
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produtos" className="pb-5">
        <div
          className="container-fluid px-3 px-md-5"
          style={{ maxWidth: 1540 }}
        >
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
            <div>
              <h2 className="fw-bold mb-2">Escolha sua próxima peça</h2>

              <p className="mb-0" style={{ color: theme.brownSoft }}>
                Use os filtros para encontrar produtos por categoria, tipo,
                subtipo, tamanho, preço e cor.
              </p>
            </div>

            <button
              type="button"
              className="btn fw-semibold"
              onClick={loadProducts}
              style={{
                borderRadius: 999,
                background: "#fff",
                color: theme.brown,
                border: `1px solid rgba(92,54,34,.18)`,
                padding: "10px 18px",
              }}
            >
              Atualizar vitrine
            </button>
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

          <div className="row g-3">
            {paginatedProducts.map((product) => (
              <div className="col-6 col-md-4 col-xl-3" key={product.id}>
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
                    background: "#fff",
                    borderRadius: 22,
                    padding: 30,
                    textAlign: "center",
                    color: theme.brownSoft,
                    border: "1px solid rgba(92,54,34,.08)",
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
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                style={{ borderRadius: 999 }}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          background: `linear-gradient(135deg, ${theme.brown}, ${theme.brownDark})`,
          color: theme.ivory,
          padding: "48px 0",
        }}
      >
        <div className="container-fluid px-3 px-md-5 text-center">
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
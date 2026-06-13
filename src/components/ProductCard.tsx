"use client";

import { useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingBag,
} from "lucide-react";

import { Product } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { useCart } from "@/contexts/CartContext";

type ProductCardProps = {
  product: Product;
  onView?: () => void;
};

function hasValue(value?: string | number | null) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return text !== "" && text !== "-";
}

function productIsInCart(cartData: unknown, productId: string) {
  const data = cartData as {
    items?: Array<{ id?: string; productId?: string; product?: Product }>;
    cart?: Array<{ id?: string; productId?: string; product?: Product }>;
    cartItems?: Array<{ id?: string; productId?: string; product?: Product }>;
  };

  const items = data.items || data.cart || data.cartItems || [];

  return items.some(
    (item) =>
      item.id === productId ||
      item.productId === productId ||
      item.product?.id === productId,
  );
}

export default function ProductCard({ product, onView }: ProductCardProps) {
  const cart = useCart();
  const { addToCart } = cart;

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];

  const [index, setIndex] = useState(0);
  const currentImage = images[index];
  const added = productIsInCart(cart, product.id);

  const sizeAge = product.size || product.age || "";

  const details = [
    hasValue(product.category) && ["Categoria", product.category],
    hasValue(product.type) && ["Tipo", product.type],
    hasValue(product.subtype) && ["Subtipo", product.subtype],
    hasValue(sizeAge) && ["Tamanho / Idade", sizeAge],
    hasValue(product.gender) && ["Sexo", product.gender],
    hasValue(product.brand) && ["Marca", product.brand],
  ].filter(Boolean) as [string, string][];

  function handleView() {
    if (onView) onView();
  }

  return (
    <article
      onClick={handleView}
      style={{
        background: "#fffaf3",
        borderRadius: 26,
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 18px 38px rgba(54,35,24,.10)",
        cursor: onView ? "pointer" : "default",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      {added && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 5,
            background: "#198754",
            color: "#fff",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          <CheckCircle size={15} className="me-1" />
          Produto no carrinho
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: 300,
          background:
            "linear-gradient(180deg, #f5ecdf 0%, #efe2d3 100%)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 14,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#f8efe5",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={product.name || "Produto"}
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
              }}
            />
          ) : (
            <span style={{ color: theme.brownSoft }}>Sem imagem</span>
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
              }}
              style={arrowStyle("left")}
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
              }}
              style={arrowStyle("right")}
              aria-label="Próxima imagem"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div
        className="p-3"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#fffaf3",
        }}
      >
        {hasValue(product.name) && (
          <h5
            className="fw-bold mb-1"
            style={{
              color: theme.brownDark,
              lineHeight: 1.25,
              minHeight: 28,
            }}
          >
            {product.name}
          </h5>
        )}

        <p className="fw-bold fs-5 mb-2" style={{ color: theme.brown }}>
          {formatMoney(product.price)}
        </p>

        {details.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {details.map(([label, value], itemIndex) => (
              <span
                key={`${label}-${value}-${itemIndex}`}
                style={{
                  fontSize: 12,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "#efe2d3",
                  color: theme.brownDark,
                  lineHeight: 1.2,
                }}
              >
                <strong>{label}:</strong> {value}
              </span>
            ))}
          </div>
        )}

        <div className="d-flex gap-2 mt-auto">
          {onView && (
            <button
              type="button"
              className="btn btn-outline-secondary flex-fill"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              style={{
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              <Eye size={16} className="me-1" />
              Ver
            </button>
          )}

          <button
            type="button"
            className="btn flex-fill"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            style={{
              background: added ? "#198754" : theme.brown,
              color: "#fff",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            {added ? (
              <>
                <CheckCircle size={16} className="me-1" />
                Adicionado
              </>
            ) : (
              <>
                <ShoppingBag size={16} className="me-1" />
                Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 14,
    top: "50%",
    transform: "translateY(-50%)",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,.96)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,.14)",
    zIndex: 4,
  };
}
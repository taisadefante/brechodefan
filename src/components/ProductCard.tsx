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
    ? product.images.filter((image) => Boolean(image))
    : [];

  const [index, setIndex] = useState(0);
  const currentImage = images[index];

  const added = productIsInCart(cart, product.id);

  const details = [
    hasValue(product.category) && ["Categoria", product.category],
    hasValue(product.type) && ["Tipo", product.type],
    hasValue(product.subtype) && ["Subtipo", product.subtype],
    hasValue(product.size) && ["Tamanho", product.size],
    hasValue(product.age) && ["Idade", product.age],
    hasValue(product.gender) && ["Sexo", product.gender],
    hasValue(product.brand) && ["Marca", product.brand],
  ].filter(Boolean) as [string, string][];

  function handleView() {
    if (onView) {
      onView();
    }
  }

  return (
    <div
      onClick={handleView}
      style={{
        background: "#fffaf3",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 14px 32px rgba(54,35,24,.10)",
        cursor: onView ? "pointer" : "default",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
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
          height: 340,
          background: "#f3eadf",
          position: "relative",
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
              objectFit: "contain",
              padding: 10,
              display: "block",
            }}
          />
        ) : (
          <span>Sem imagem</span>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
              }}
              style={arrowStyle("left")}
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
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div
        className="p-3"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        {hasValue(product.name) && (
          <h5 className="fw-bold mb-1">{product.name}</h5>
        )}

        <p className="fw-bold fs-5 mb-2" style={{ color: theme.brown }}>
          {formatMoney(product.price)}
        </p>

        {details.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {details.map(([label, value]) => (
              <span
                key={`${label}-${value}`}
                style={{
                  fontSize: 12,
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "#efe2d3",
                  color: theme.brownDark,
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
              style={{ borderRadius: 999 }}
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
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,.95)",
  };
}

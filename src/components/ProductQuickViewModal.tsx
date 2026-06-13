"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import { Product } from "@/types";
import { formatMoney } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { useCart } from "@/contexts/CartContext";

function hasValue(value?: string | number | null) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return text !== "" && text !== "-";
}

function hasNumber(value?: number | null) {
  return value !== undefined && value !== null && Number(value) > 0;
}

export default function ProductQuickViewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { addToCart } = useCart();

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];

  const [index, setIndex] = useState(0);
  const currentImage = images[index];

  const sizeAge = product.size || product.age || "";

  const details = [
    hasValue(product.category) && ["Categoria", product.category],
    hasValue(product.type) && ["Tipo", product.type],
    hasValue(product.subtype) && ["Subtipo", product.subtype],
    hasValue(sizeAge) && ["Tamanho / Idade", sizeAge],
    hasValue(product.gender) && ["Sexo", product.gender],
    hasValue(product.brand) && ["Marca", product.brand],
    hasValue(product.condition) && ["Estado", product.condition],
    hasValue(product.color) && ["Cor", product.color],
    hasValue(product.measurements) && ["Medidas", product.measurements],
    hasNumber(product.weight) && ["Peso", `${product.weight} kg`],
    hasNumber(product.height) && ["Altura", `${product.height} cm`],
    hasNumber(product.width) && ["Largura", `${product.width} cm`],
    hasNumber(product.length) && ["Comprimento", `${product.length} cm`],
  ].filter(Boolean) as [string, string][];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.58)",
        zIndex: 9999,
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div className="container my-4" style={{ maxWidth: 1040 }}>
        <div
          className="row g-0"
          style={{
            background: "#fffaf3",
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 26px 70px rgba(0,0,0,.25)",
          }}
        >
          <div className="col-md-6 p-3">
            <div
              style={{
                height: 520,
                background: "#f3eadf",
                borderRadius: 22,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                    objectPosition: "center",
                    background: "#f3eadf",
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
                    onClick={() =>
                      setIndex((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1,
                      )
                    }
                    style={modalArrowStyle("left")}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIndex((prev) =>
                        prev === images.length - 1 ? 0 : prev + 1,
                      )
                    }
                    style={modalArrowStyle("right")}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="d-flex flex-wrap gap-2 mt-3">
                {images.map((img, imgIndex) => (
                  <button
                    type="button"
                    key={`${img}-${imgIndex}`}
                    onClick={() => setIndex(imgIndex)}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      border:
                        imgIndex === index
                          ? `3px solid ${theme.brown}`
                          : `1px solid ${theme.border}`,
                      background: "#f3eadf",
                      padding: 0,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        background: "#f3eadf",
                        display: "block",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-md-6 p-4">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                {hasValue(product.name) && (
                  <h2
                    className="fw-bold mb-2"
                    style={{ color: theme.brownDark }}
                  >
                    {product.name}
                  </h2>
                )}

                <h3 className="fw-bold" style={{ color: theme.brown }}>
                  {formatMoney(product.price)}
                </h3>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                style={{ borderRadius: "50%", width: 42, height: 42 }}
              >
                <X size={18} />
              </button>
            </div>

            {hasValue(product.description) && (
              <p className="mb-3" style={{ color: theme.brownSoft }}>
                {product.description}
              </p>
            )}

            {details.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-bold mb-2">Detalhes</h6>

                <div className="d-flex flex-wrap gap-2">
                  {details.map(([label, value]) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 13,
                        padding: "7px 11px",
                        borderRadius: 999,
                        background: "#efe2d3",
                        color: theme.brownDark,
                      }}
                    >
                      <strong>{label}:</strong> {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-lg w-100"
              onClick={() => {
                addToCart(product);
                onClose();
              }}
              style={{
                background: theme.brown,
                color: "#fff",
                borderRadius: 999,
              }}
            >
              <ShoppingBag size={18} className="me-2" />
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function modalArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,.95)",
    zIndex: 4,
  };
}
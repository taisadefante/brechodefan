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
    hasValue(sizeAge) && ["Tamanho", sizeAge],
    hasValue(product.gender) && ["Sexo", product.gender],
    hasValue(product.brand) && ["Marca", product.brand],
  ].filter(Boolean) as [string, string][];

  function handleView() {
    if (onView) onView();
  }

  return (
    <>
      <style jsx>{`
        .product-card {
          background: #fffaf3;
          border-radius: 26px;
          overflow: hidden;
          border: 1px solid ${theme.border};
          box-shadow: 0 18px 38px rgba(54, 35, 24, 0.1);
          cursor: ${onView ? "pointer" : "default"};
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 45px rgba(54, 35, 24, 0.16);
        }

        .image-area {
          width: 100%;
          height: 300px;
          background: linear-gradient(180deg, #f5ecdf 0%, #efe2d3 100%);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 14px;
        }

        .image-box {
          width: 100%;
          height: 100%;
          background: #f8efe5;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
        }

        .card-body-custom {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #fffaf3;
          padding: 16px;
        }

        .product-title {
          color: ${theme.brownDark};
          line-height: 1.25;
          min-height: 42px;
          font-size: 1.05rem;
          margin-bottom: 10px;
        }

        .details-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 14px;
        }

        .detail-pill {
          font-size: 12px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #efe2d3;
          color: ${theme.brownDark};
          line-height: 1.2;
          max-width: 100%;
          word-break: break-word;
        }

        .price-section {
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid #eadfce;
          margin-bottom: 14px;
        }

        .price-label {
          display: block;
          font-size: 11px;
          color: ${theme.brownSoft};
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .product-price {
          color: ${theme.brown};
          font-weight: 900;
          font-size: 1.75rem;
          line-height: 1;
          margin: 0;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          border-radius: 999px;
          font-weight: 700;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          white-space: nowrap;
          font-size: 14px;
        }

        .added-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          z-index: 5;
          background: #198754;
          color: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        @media (max-width: 575px) {
          .product-card {
            border-radius: 20px;
            box-shadow: 0 12px 26px rgba(54, 35, 24, 0.1);
          }

          .image-area {
            height: 210px;
            padding: 10px;
          }

          .image-box {
            border-radius: 17px;
          }

          .card-body-custom {
            padding: 13px;
          }

          .product-title {
            font-size: 0.98rem;
            text-align: center;
            min-height: auto;
            margin-bottom: 10px;
          }

          .details-list {
            justify-content: center;
            gap: 6px;
            margin-bottom: 12px;
          }

          .detail-pill {
            font-size: 11px;
            padding: 5px 8px;
          }

          .price-section {
            text-align: center;
            padding-top: 12px;
            margin-bottom: 12px;
          }

          .product-price {
            font-size: 1.55rem;
          }

          .actions {
            flex-direction: column;
            gap: 7px;
          }

          .action-btn {
            width: 100%;
            min-height: 40px;
            font-size: 13px;
          }

          .added-badge {
            font-size: 12px;
            padding: 7px 10px;
            left: 10px;
            right: 10px;
          }
        }
      `}</style>

      <article className="product-card" onClick={handleView}>
        {added && (
          <div className="added-badge">
            <CheckCircle size={15} />
            Produto no carrinho
          </div>
        )}

        <div className="image-area">
          <div className="image-box">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name || "Produto"}
                className="product-img"
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
                  setIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1,
                  );
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
                  setIndex((prev) =>
                    prev === images.length - 1 ? 0 : prev + 1,
                  );
                }}
                style={arrowStyle("right")}
                aria-label="Próxima imagem"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        <div className="card-body-custom">
          {hasValue(product.name) && (
            <h5 className="fw-bold product-title">{product.name}</h5>
          )}

          {details.length > 0 && (
            <div className="details-list">
              {details.map(([label, value], itemIndex) => (
                <span
                  key={`${label}-${value}-${itemIndex}`}
                  className="detail-pill"
                >
                  <strong>{label}:</strong> {value}
                </span>
              ))}
            </div>
          )}

          <div className="price-section">
            <span className="price-label">Preço</span>
            <p className="product-price">{formatMoney(product.price)}</p>
          </div>

          <div className="actions">
            {onView && (
              <button
                type="button"
                className="btn btn-outline-secondary flex-fill action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye size={16} />
                Ver
              </button>
            )}

            <button
              type="button"
              className="btn flex-fill action-btn"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              style={{
                background: added ? "#198754" : theme.brown,
                color: "#fff",
              }}
            >
              {added ? (
                <>
                  <CheckCircle size={16} />
                  Adicionado
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  Adicionar
                </>
              )}
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
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
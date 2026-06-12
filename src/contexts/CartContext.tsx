"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartItem, Product } from "@/types";

type CartContextType = {
  items: CartItem[];
  subtotal: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "defan-brecho-cart";

function getStock(product: Product | CartItem) {
  return Math.max(Number(product.stock || 0), 0);
}

function normalizeQuantity(quantity: number, stock: number) {
  const cleanQuantity = Math.max(Number(quantity || 1), 1);

  if (stock <= 0) return 1;

  return Math.min(cleanQuantity, stock);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];

        if (Array.isArray(parsed)) {
          setItems(
            parsed.map((item) => ({
              ...item,
              quantity: normalizeQuantity(
                Number(item.quantity || 1),
                getStock(item),
              ),
            })),
          );
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0,
    );
  }, [items]);

  function addToCart(product: Product) {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === product.id);
      const stock = getStock(product);

      if (stock <= 0) {
        alert("Produto sem estoque.");
        return currentItems;
      }

      if (existing) {
        const currentQuantity = Number(existing.quantity || 1);

        if (currentQuantity >= stock) {
          alert(`Você já adicionou o máximo disponível em estoque: ${stock}.`);
          return currentItems;
        }

        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...product,
                quantity: normalizeQuantity(currentQuantity + 1, stock),
              }
            : item,
        );
      }

      const newItem: CartItem = {
        ...product,
        quantity: 1,
        addedAt: Date.now(),
      };

      return [...currentItems, newItem];
    });
  }

  function removeFromCart(productId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== productId) return item;

        const stock = getStock(item);

        return {
          ...item,
          quantity: normalizeQuantity(quantity, stock),
        };
      }),
    );
  }

  function clearCart() {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart precisa ser usado dentro de CartProvider.");
  }

  return context;
}
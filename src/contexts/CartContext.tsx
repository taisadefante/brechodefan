"use client";

import { reserveProduct, releaseProduct } from "@/lib/firestore";
import { CartItem, Product } from "@/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartContextType = {
  items: CartItem[];
  subtotal: number;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
};

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "defan_brecho_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartItem[];
      const valid = parsed.filter((item) => item.addedAt + 2 * 60 * 60 * 1000 > Date.now());
      setItems(valid);
      localStorage.setItem(CART_KEY, JSON.stringify(valid));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  async function addToCart(product: Product) {
    if (items.some((item) => item.id === product.id)) return;
    await reserveProduct(product.id);
    setItems((prev) => [...prev, { ...product, addedAt: Date.now(), status: "reservado" }]);
  }

  async function removeFromCart(productId: string) {
    await releaseProduct(productId);
    setItems((prev) => prev.filter((item) => item.id !== productId));
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    setItems([]);
  }

  function isInCart(productId: string) {
    return items.some((item) => item.id === productId);
  }

  const value = useMemo(() => ({ items, subtotal, addToCart, removeFromCart, clearCart, isInCart }), [items, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}

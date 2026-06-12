"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag } from "lucide-react";
import { theme } from "@/lib/theme";

export default function ObrigadoPage() {
  return (
    <main className="container py-5">
      <div
        className="mx-auto text-center p-5"
        style={{
          maxWidth: 720,
          background: theme.ivory2,
          borderRadius: 32,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
        }}
      >
        <CheckCircle size={72} color="#198754" className="mb-3" />

        <h1 className="fw-bold">Obrigada pela sua compra!</h1>

        <p className="lead" style={{ color: theme.brownSoft }}>
          Seu pedido foi registrado com sucesso. Agradecemos pela sua compra no
          Defan Brechó.
        </p>

        <p style={{ color: theme.brownSoft }}>
          Você pode acompanhar o status do pedido em “Minha conta”.
        </p>

        <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
          <Link
            href="/minha-conta"
            className="btn btn-lg"
            style={{
              background: theme.brown,
              color: "#fff",
              borderRadius: 999,
            }}
          >
            <ShoppingBag size={18} className="me-2" />
            Ver minhas compras
          </Link>

          <Link
            href="/"
            className="btn btn-lg btn-outline-secondary"
            style={{ borderRadius: 999 }}
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    </main>
  );
}
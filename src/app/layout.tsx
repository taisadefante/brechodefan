import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Defan Brechó",
  description: "Brechó online com peças únicas em Realengo/RJ.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          background: "#f8f1e7",
          color: "#3b2418",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>

            <main style={{ flex: 1 }}>{children}</main>

            <Footer />

            <WhatsAppButton />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
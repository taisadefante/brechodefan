"use client";

import { Heart, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        background:
          "linear-gradient(135deg,#2b140a 0%,#4a2816 50%,#6f4128 100%)",
        color: "#fff",
      }}
    >
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-4">
            <h3
              style={{
                fontWeight: 800,
                marginBottom: 16,
              }}
            >
              Defan Brechó
            </h3>

            <p
              style={{
                color: "rgba(255,255,255,.75)",
                lineHeight: 1.8,
                marginBottom: 0,
              }}
            >
              Moda circular com peças únicas selecionadas. Compras online com
              segurança e atendimento personalizado.
            </p>
          </div>

          <div className="col-lg-4">
            <h5
              style={{
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Informações
            </h5>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span>📍 Realengo - RJ</span>
              <span>🚚 Entrega para todo Brasil</span>
              <span>♻️ Moda sustentável</span>
              <span>🛍️ Peças únicas</span>
            </div>
          </div>

          <div className="col-lg-4">
            <h5
              style={{
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Contato
            </h5>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <a
                href="https://wa.me/5521988359825"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                <MessageCircle size={18} style={{ marginRight: 8 }} />
                WhatsApp
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                <Instagram size={18} style={{ marginRight: 8 }} />
                Instagram
              </a>
            </div>
          </div>
        </div>

        <hr
          style={{
            borderColor: "rgba(255,255,255,.15)",
            margin: "30px 0 20px",
          }}
        />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div
            style={{
              color: "rgba(255,255,255,.75)",
            }}
          >
            © {new Date().getFullYear()} Defan Brechó
          </div>

          <a
            href="https://wa.me/5521988359825"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Desenvolvido por Defan Soluções Digitais
          </a>

          <div
            style={{
              color: "rgba(255,255,255,.75)",
            }}
          >
            Feito com <Heart size={14} fill="currentColor" />
          </div>
        </div>
      </div>
    </footer>
  );
}

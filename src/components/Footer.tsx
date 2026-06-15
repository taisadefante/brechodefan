"use client";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 60,
        background:
          "linear-gradient(135deg,#2b140a 0%,#4a2816 50%,#6f4128 100%)",
        color: "#fff",
      }}
    >
      <div
        className="container-fluid px-3 px-md-5"
        style={{
          maxWidth: 1400,
        }}
      >
        <div className="py-4 py-md-5">
          <div className="row g-4 text-center text-md-start">
            <div className="col-12 col-md-4">
              <h4
                style={{
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                Defan Brechó
              </h4>

              <p
                style={{
                  color: "rgba(255,255,255,.75)",
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                Moda circular com peças selecionadas, preços acessíveis e compra
                segura.
              </p>
            </div>

            <div className="col-12 col-md-4">
              <h5
                style={{
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Benefícios
              </h5>

              <div
                style={{
                  color: "rgba(255,255,255,.75)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span>🚚 Entrega para todo Brasil</span>
                <span>💳 Pagamento via Mercado Pago</span>
                <span>♻️ Moda sustentável</span>
                <span>🛍️ Produtos selecionados</span>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <h5
                style={{
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Compra Segura
              </h5>

              <div
                style={{
                  color: "rgba(255,255,255,.75)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span>🔒 Ambiente seguro</span>
                <span>📦 Produtos disponíveis</span>
                <span>🏠 Retirada em Realengo/RJ</span>
                <span>⭐ Atendimento personalizado</span>
              </div>
            </div>
          </div>

          <hr
            style={{
              borderColor: "rgba(255,255,255,.12)",
              margin: "24px 0",
            }}
          />

          <div
            className="text-center"
            style={{
              color: "rgba(255,255,255,.70)",
              fontSize: 14,
            }}
          >
            © {new Date().getFullYear()} Defan Brechó • Todos os direitos
            reservados
          </div>

          <div
            className="text-center mt-2"
            style={{
              color: "rgba(255,255,255,.55)",
              fontSize: 13,
            }}
          >
            Desenvolvido por Defan Soluções Digitais
          </div>
        </div>
      </div>
    </footer>
  );
}
import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";
import Footer from "@/components/Footer";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://defanbrecho.com.br";

const siteName = "Defan Brechó";

const description =
  "Defan Brechó é um brechó online em Realengo/RJ com roupas, acessórios e peças únicas selecionadas. Compre moda circular, economize e renove seu guarda-roupa com segurança.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5c3622",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "Defan Brechó | Brechó Online em Realengo/RJ",
    template: "%s | Defan Brechó",
  },
  description,
  keywords: [
    "brechó online",
    "brechó Realengo",
    "brechó RJ",
    "brechó infantil",
    "roupas usadas",
    "roupas seminovas",
    "moda circular",
    "desapego online",
    "comprar roupa barata",
    "brechó feminino",
    "brechó masculino",
    "brechó bebê",
    "Defan Brechó",
    "Realengo",
    "Rio de Janeiro",
  ],
  authors: [{ name: "Defan Brechó", url: siteUrl }],
  creator: "Defan Brechó",
  publisher: "Defan Brechó",
  category: "E-commerce",
  alternates: {
    canonical: siteUrl,
    languages: {
      "pt-BR": siteUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName,
    title: "Defan Brechó | Brechó Online em Realengo/RJ",
    description,
    images: [
      {
        url: "/og-defan-brecho.jpg",
        width: 1200,
        height: 630,
        alt: "Defan Brechó - Brechó Online em Realengo/RJ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Defan Brechó | Brechó Online em Realengo/RJ",
    description,
    images: ["/og-defan-brecho.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
  manifest: "/site.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "geo.region": "BR-RJ",
    "geo.placename": "Realengo, Rio de Janeiro",
    "geo.position": "-22.8766;-43.4303",
    ICBM: "-22.8766, -43.4303",
    "theme-color": "#5c3622",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Store",
      "@id": `${siteUrl}/#store`,
      name: "Defan Brechó",
      url: siteUrl,
      image: `${siteUrl}/og-defan-brecho.jpg`,
      logo: `${siteUrl}/logo-defan-brecho.png`,
      description,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Realengo",
        addressRegion: "RJ",
        addressCountry: "BR",
      },
      areaServed: [
        "Realengo",
        "Bangu",
        "Campo Grande",
        "Rio de Janeiro",
        "Brasil",
      ],
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Defan Brechó",
      url: siteUrl,
      description,
      inLanguage: "pt-BR",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/?busca={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Defan Brechó",
      url: siteUrl,
      logo: `${siteUrl}/logo-defan-brecho.png`,
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />

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
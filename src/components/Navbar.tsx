"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/lib/theme";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { items } = useCart();
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const totalItems = items.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const totalCart = items.reduce(
    (acc, item) => acc + Number(item.price || 0) * (item.quantity || 1),
    0,
  );

  useEffect(() => {
    setSearch(searchParams.get("busca") || "");
  }, [searchParams]);

  function handleSearch(value: string) {
    setSearch(value);

    const query = value.trim();

    if (query) {
      router.replace(`/?busca=${encodeURIComponent(query)}#produtos`, {
        scroll: false,
      });
    } else {
      router.replace("/#produtos", { scroll: false });
    }
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav
      className="sticky-top"
      style={{
        background: theme.ivory2,
        borderBottom: `1px solid ${theme.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,.04)",
        zIndex: 999,
      }}
    >
      <div className="container">
        <div
          className="d-flex align-items-center gap-4"
          style={{ minHeight: 78 }}
        >
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <Image
              src="/logo-defan-brecho.png"
              alt="Defan Brechó"
              width={120}
              height={58}
              priority
              style={{
                objectFit: "contain",
                width: 120,
                height: 58,
              }}
            />
          </Link>

          <div className="d-none d-lg-flex align-items-center gap-3 ms-auto">
            <Link
              href="/"
              className="nav-link"
              style={{
                color: theme.brownDark,
                fontWeight: pathname === "/" ? 800 : 600,
              }}
            >
              Início
            </Link>

            <Link
              href="/#produtos"
              className="nav-link"
              style={{
                color: theme.brownDark,
                fontWeight: 600,
              }}
            >
              Produtos
            </Link>

            {user ? (
              <>
                <Link
                  href="/minha-conta"
                  className="nav-link"
                  style={{
                    color: theme.brownDark,
                    fontWeight: pathname === "/minha-conta" ? 800 : 600,
                  }}
                >
                  <User size={16} className="me-1" />
                  Minha Conta
                </Link>

                <button
                  onClick={logout}
                  className="btn btn-outline-secondary"
                  style={{
                    borderRadius: 999,
                  }}
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/minha-conta"
                className="btn"
                style={{
                  background: theme.brownDark,
                  color: "#fff",
                  borderRadius: 999,
                  padding: "8px 18px",
                  fontWeight: 700,
                }}
              >
                Login / Cadastro
              </Link>
            )}

            <div className="d-flex align-items-center gap-2 ms-3">
              <Link
                href="/carrinho"
                aria-label="Carrinho"
                className="position-relative d-flex align-items-center justify-content-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: theme.brown,
                  color: "#fff",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <ShoppingCart size={24} />

                {totalItems > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -7,
                      right: -7,
                      minWidth: 23,
                      height: 23,
                      padding: "0 6px",
                      borderRadius: 999,
                      background: theme.brownDark,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${theme.ivory2}`,
                    }}
                  >
                    {totalItems}
                  </span>
                )}
              </Link>

              <strong
                style={{
                  color: theme.brownDark,
                  whiteSpace: "nowrap",
                  fontSize: 15,
                }}
              >
                {formatMoney(totalCart)}
              </strong>
            </div>
          </div>

          <div className="d-flex d-lg-none align-items-center gap-2 ms-auto">
            <Link
              href="/carrinho"
              aria-label="Carrinho"
              className="position-relative d-flex align-items-center justify-content-center"
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: theme.brown,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <ShoppingCart size={22} />

              {totalItems > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 21,
                    height: 21,
                    borderRadius: 999,
                    background: theme.brownDark,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${theme.ivory2}`,
                  }}
                >
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="btn"
              onClick={() => setOpen(!open)}
              style={{
                color: theme.brownDark,
              }}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {open && (
          <div
            className="d-lg-none pb-3"
            style={{
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            <form onSubmit={(e) => e.preventDefault()} className="pt-3">
              <div className="input-group mb-3">
                <input
                  className="form-control"
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />

                <button
                  type="button"
                  className="btn"
                  onClick={() => router.push("/#produtos")}
                  style={{
                    background: theme.brown,
                    color: "#fff",
                  }}
                >
                  <Search size={18} />
                </button>
              </div>
            </form>

            <div className="mb-3 fw-bold" style={{ color: theme.brownDark }}>
              Carrinho: {totalItems} item(ns) — {formatMoney(totalCart)}
            </div>

            <div className="d-flex flex-column gap-2">
              <Link
                href="/"
                className="btn btn-light text-start"
                onClick={closeMenu}
              >
                Início
              </Link>

              <Link
                href="/#produtos"
                className="btn btn-light text-start"
                onClick={closeMenu}
              >
                Produtos
              </Link>

              <Link
                href="/carrinho"
                className="btn text-start"
                style={{
                  background: theme.brown,
                  color: "#fff",
                }}
                onClick={closeMenu}
              >
                <ShoppingCart size={17} className="me-2" />
                Carrinho ({totalItems}) - {formatMoney(totalCart)}
              </Link>

              {user ? (
                <>
                  <Link
                    href="/minha-conta"
                    className="btn btn-light text-start"
                    onClick={closeMenu}
                  >
                    Minha Conta
                  </Link>

                  <button
                    className="btn btn-outline-secondary text-start"
                    onClick={async () => {
                      await logout();
                      closeMenu();
                    }}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/minha-conta"
                  className="btn"
                  style={{
                    background: theme.brownDark,
                    color: "#fff",
                  }}
                  onClick={closeMenu}
                >
                  Login / Cadastro
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

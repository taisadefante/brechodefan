"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      router.push("/minha-conta");
    } catch {
      setErro("Não foi possível entrar. Confira e-mail e senha.");
    }
  }

  return (
    <main className="container py-5" style={{ maxWidth: 520 }}>
      <div className="p-4" style={{ background: theme.ivory2, borderRadius: 28, boxShadow: theme.shadow }}>
        <h1 className="fw-bold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p>Entre para finalizar compras e acompanhar seus pedidos.</p>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <form onSubmit={submit}>
          <input className="form-control mb-3" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="form-control mb-3" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn w-100" style={{ background: theme.brown, color: "#fff", borderRadius: 999 }}>
            {mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <button className="btn btn-link w-100 mt-3" onClick={() => setMode(mode === "login" ? "cadastro" : "login")}>
          {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
        </button>
      </div>
    </main>
  );
}

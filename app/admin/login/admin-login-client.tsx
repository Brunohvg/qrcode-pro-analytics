"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginClient({ email, configured }: { email: string; configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível liberar o painel administrativo.");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell py-12 md:py-20">
      <section className="card max-w-md mx-auto p-6 sm:p-8">
        <span className="badge">Acesso administrativo</span>
        <h1 className="text-2xl sm:text-3xl font-black mt-4">Desbloquear painel do SaaS</h1>
        <p className="muted text-sm mt-3 leading-relaxed">Conta autorizada: <strong className="text-white break-all">{email}</strong>. Digite a senha administrativa separada configurada no servidor.</p>

        {!configured && (
          <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            Configure <code>DEVELOPER_ADMIN_PASSWORD</code> no ambiente do aplicativo antes de acessar o painel.
          </div>
        )}

        {error && <div className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="text-sm font-bold">
            Senha administrativa
            <input
              className="input mt-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha do painel"
              required
              disabled={!configured || loading}
            />
          </label>
          <button className="btn-primary w-full" disabled={!configured || loading || !password}>
            {loading ? "Validando..." : "Entrar no painel administrativo"}
          </button>
        </form>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha no login.");
      router.push("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha no login."); }
    finally { setLoading(false); }
  }

  return <main className="shell py-14 md:py-20 flex justify-center"><div className="card w-full max-w-md p-7 md:p-9">
    <span className="badge">Acesso seguro</span><h1 className="text-3xl font-black mt-4">Entrar</h1><p className="muted mt-2">Acesse seu painel de QR Codes.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-bold">E-mail<input className="input mt-2" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label className="block text-sm font-bold">Senha<input className="input mt-2" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
    </form>
    <p className="muted text-sm mt-5 text-center">Ainda não tem conta? <Link className="text-emerald-300 font-bold" href="/register">Cadastre-se</Link></p>
  </div></main>;
}

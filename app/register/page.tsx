"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (form.password !== form.confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha no cadastro.");
      router.push("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha no cadastro."); }
    finally { setLoading(false); }
  }

  return <main className="shell py-14 md:py-20 flex justify-center"><div className="card w-full max-w-md p-7 md:p-9">
    <span className="badge">Plano Gratuito</span><h1 className="text-3xl font-black mt-4">Criar conta</h1><p className="muted mt-2">Comece com até 3 QR Codes.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-bold">E-mail<input className="input mt-2" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></label>
      <label className="block text-sm font-bold">Senha<input className="input mt-2" type="password" minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /><span className="muted text-xs block mt-2">Mínimo 8 caracteres, com maiúscula, minúscula e número.</span></label>
      <label className="block text-sm font-bold">Confirmar senha<input className="input mt-2" type="password" minLength={8} value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} required /></label>
      {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Criando..." : "Criar minha conta"}</button>
    </form>
    <p className="muted text-sm mt-5 text-center">Já possui conta? <Link className="text-emerald-300 font-bold" href="/login">Entrar</Link></p>
  </div></main>;
}

"use client";

import Link from "next/link";
import { useState } from "react";

const plans = [
  { name: "Gratuito", price: "R$ 0", suffix: "/mês", highlight: false, features: ["Até 3 QR Codes dinâmicos", "Contagem total de scans", "Distribuição por dispositivo", "Download SVG"] },
  { name: "Pro", price: "R$ 29", suffix: "/mês", highlight: true, features: ["QR Codes ilimitados", "Alteração de destino", "Analytics de 30 dias", "País, navegador e dispositivo"] },
  { name: "Enterprise", price: "R$ 99", suffix: "/mês", highlight: false, features: ["Tudo do Pro", "QR Codes ilimitados", "Base preparada para times/API", "Prioridade para futuras integrações"] },
] as const;

export default function PlansClient() {
  const [loading, setLoading] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function choose(planName: string) {
    setLoading(planName); setMessage(""); setError("");
    try {
      const response = await fetch("/api/plans/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planName }) });
      const data = await response.json();
      if (response.status === 401) { setError("Faça login primeiro para ativar um plano."); return; }
      if (!response.ok) throw new Error(data.message || "Falha ao alterar plano.");
      setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao alterar plano."); }
    finally { setLoading(""); }
  }
  return <main className="shell py-14 md:py-20"><div className="text-center max-w-2xl mx-auto"><span className="badge">Planos simples</span><h1 className="text-4xl md:text-5xl font-black mt-4">Escolha seu nível de operação</h1><p className="muted mt-4">O checkout nesta versão é simulado: o plano é ativado imediatamente no banco, sem cobrança real.</p></div>
    {message && <div className="max-w-xl mx-auto mt-7 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-emerald-200">{message} <Link href="/dashboard" className="font-bold underline">Abrir dashboard</Link></div>}
    {error && <div className="max-w-xl mx-auto mt-7 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-center text-rose-200">{error} <Link href="/login" className="font-bold underline">Entrar</Link></div>}
    <div className="grid md:grid-cols-3 gap-5 mt-10">{plans.map(plan=><article key={plan.name} className={`card p-7 relative ${plan.highlight ? "ring-2 ring-emerald-300/70" : ""}`}>{plan.highlight && <span className="badge absolute -top-3 right-5">Mais escolhido</span>}<h2 className="text-xl font-black">{plan.name}</h2><div className="mt-4"><span className="text-4xl font-black">{plan.price}</span><span className="muted">{plan.suffix}</span></div><ul className="mt-6 space-y-3 text-sm">{plan.features.map(f=><li key={f} className="flex gap-2"><span className="text-emerald-300">✓</span><span>{f}</span></li>)}</ul><button onClick={()=>void choose(plan.name)} disabled={!!loading} className={plan.highlight ? "btn-primary w-full mt-7" : "btn-secondary w-full mt-7"}>{loading === plan.name ? "Ativando..." : plan.name === "Gratuito" ? "Usar Gratuito" : `Simular ${plan.name}`}</button></article>)}</div>
  </main>;
}

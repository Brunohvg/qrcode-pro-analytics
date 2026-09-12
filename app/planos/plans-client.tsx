"use client";

import Link from "next/link";
import { useState } from "react";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    suffix: "/mês",
    description: "Para experimentar QR dinâmico e acompanhar os primeiros resultados.",
    highlight: false,
    features: ["3 QR Codes dinâmicos", "Analytics dos últimos 7 dias", "Dispositivo, navegador e país", "Gerador de link para WhatsApp", "Download do QR em SVG"],
  },
  {
    name: "Pro",
    price: "R$ 49,90",
    suffix: "/mês",
    description: "Para profissionais, criadores e pequenos negócios que usam QR em campanhas.",
    highlight: true,
    features: ["30 QR Codes dinâmicos", "Analytics por 90 dias", "Campanhas e organização", "UTM automático", "Agendamento e expiração", "Proteção por senha", "Branding e impressão personalizada", "Relatórios CSV e PDF", "Alertas por meta de scans"],
  },
  {
    name: "Business",
    price: "R$ 119,90",
    suffix: "/mês",
    description: "Para lojas, marketing, agências e operações com volume e integrações.",
    highlight: false,
    features: ["200 QR Codes dinâmicos", "Analytics por 1 ano", "Tudo do Pro", "Geração em lote por CSV", "Smart Redirect por dispositivo e país", "Domínio próprio", "Google Analytics 4", "Meta Conversions API", "API com chave revogável", "Webhooks assinados"],
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    suffix: "",
    description: "Para operações que precisam de limites, suporte e arquitetura sob medida.",
    highlight: false,
    features: ["QR Codes sem limite fixo", "Histórico completo", "Todos os recursos Business", "Limites personalizados", "Integração e implantação assistidas", "Evolução corporativa sob demanda"],
  },
] as const;

export default function PlansClient() {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function choose(planName: string) {
    if (planName === "Enterprise") return;
    setLoading(planName); setMessage(""); setError("");
    try {
      const response = await fetch("/api/plans/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });
      const data = await response.json();
      if (response.status === 401) { setError("Faça login primeiro para ativar o período de teste."); return; }
      if (!response.ok) throw new Error(data.message || "Falha ao alterar plano.");
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar plano.");
    } finally {
      setLoading("");
    }
  }

  return <main className="shell py-14 md:py-20">
    <div className="text-center max-w-3xl mx-auto">
      <span className="badge">Planos para cada etapa</span>
      <h1 className="text-4xl md:text-5xl font-black mt-4">Comece grátis. Cresça quando o QR virar canal de negócio.</h1>
      <p className="muted mt-4 text-lg">QR dinâmico, analytics, campanhas e automação em uma única plataforma. Pro e Business podem ser testados por 30 dias no ambiente atual.</p>
    </div>

    {message && <div className="max-w-xl mx-auto mt-7 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-emerald-200">{message} <Link href="/dashboard" className="font-bold underline">Abrir dashboard</Link></div>}
    {error && <div className="max-w-xl mx-auto mt-7 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-center text-rose-200">{error} <Link href="/login" className="font-bold underline">Entrar</Link></div>}

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mt-10">
      {plans.map((plan) => <article key={plan.name} className={`card p-7 relative flex flex-col ${plan.highlight ? "ring-2 ring-emerald-300/70" : ""}`}>
        {plan.highlight && <span className="badge absolute -top-3 right-5">Mais escolhido</span>}
        <h2 className="text-xl font-black">{plan.name}</h2>
        <p className="muted text-sm mt-2 min-h-16 leading-relaxed">{plan.description}</p>
        <div className="mt-4"><span className={`${plan.name === "Enterprise" ? "text-3xl" : "text-4xl"} font-black`}>{plan.price}</span><span className="muted">{plan.suffix}</span></div>
        <ul className="mt-6 space-y-3 text-sm flex-1">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-emerald-300">✓</span><span>{feature}</span></li>)}</ul>
        {plan.name === "Enterprise" ? <button disabled className="btn-secondary w-full mt-7">Contratação sob consulta</button> : <button onClick={()=>void choose(plan.name)} disabled={!!loading} className={plan.highlight ? "btn-primary w-full mt-7" : "btn-secondary w-full mt-7"}>{loading === plan.name ? "Ativando..." : plan.name === "Gratuito" ? "Usar Gratuito" : "Testar 30 dias"}</button>}
      </article>)}
    </div>

    <p className="muted text-xs text-center mt-7">A cobrança recorrente ainda não está conectada; os testes Pro e Business são ativados por 30 dias sem pagamento.</p>
  </main>;
}

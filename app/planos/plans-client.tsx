"use client";

import Link from "next/link";

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
    price: "R$ 69,90",
    suffix: "/mês",
    description: "Para profissionais, criadores e pequenos negócios que usam QR em campanhas.",
    highlight: true,
    features: ["30 QR Codes dinâmicos", "Analytics por 90 dias", "Campanhas e organização", "UTM automático", "Agendamento e expiração", "Proteção por senha", "Branding e impressão personalizada", "Relatórios CSV e PDF", "Alertas por meta de scans"],
  },
  {
    name: "Business",
    price: "R$ 149,90",
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
  return <main className="shell py-12 sm:py-14 md:py-20">
    <div className="text-center max-w-3xl mx-auto">
      <span className="badge">Planos para cada etapa</span>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mt-4">Comece grátis. Cresça quando o QR virar canal de negócio.</h1>
      <p className="muted mt-4 text-base sm:text-lg leading-relaxed">Planos pagos usam Mercado Pago para cobrança recorrente. PIX também pode ser disponibilizado como alternativa conforme a configuração da plataforma.</p>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mt-8 sm:mt-10">
      {plans.map((plan) => <article key={plan.name} className={`card p-5 sm:p-7 relative flex flex-col ${plan.highlight ? "ring-2 ring-emerald-300/70" : ""}`}>
        {plan.highlight && <span className="badge absolute -top-3 right-4 sm:right-5">Mais escolhido</span>}
        <h2 className="text-xl font-black">{plan.name}</h2>
        <p className="muted text-sm mt-2 min-h-0 sm:min-h-16 leading-relaxed">{plan.description}</p>
        <div className="mt-4 flex flex-wrap items-end gap-1"><span className={`${plan.name === "Enterprise" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-black`}>{plan.price}</span><span className="muted pb-1">{plan.suffix}</span></div>
        <ul className="mt-6 space-y-3 text-sm flex-1">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-emerald-300 shrink-0">✓</span><span>{feature}</span></li>)}</ul>
        {plan.name === "Enterprise"
          ? <button disabled className="btn-secondary w-full mt-7">Contratação sob consulta</button>
          : plan.name === "Gratuito"
            ? <Link href="/register" className="btn-secondary w-full mt-7 text-center">Começar grátis</Link>
            : <Link href={`/billing?plan=${plan.name}`} className={plan.highlight ? "btn-primary w-full mt-7 text-center" : "btn-secondary w-full mt-7 text-center"}>Assinar {plan.name}</Link>}
      </article>)}
    </div>

    <div className="max-w-3xl mx-auto mt-7 sm:mt-8 card p-4 sm:p-5 text-sm leading-relaxed">
      <strong>Como a liberação funciona:</strong>
      <span className="muted"> o cliente mantém o plano atual enquanto o pagamento está pendente. Quando o Mercado Pago confirma a assinatura, os recursos são liberados automaticamente. Em caso de falha recorrente, existe período de carência antes do downgrade. PIX fixo, quando habilitado, passa por aprovação no painel administrativo.</span>
    </div>
  </main>;
}

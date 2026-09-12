"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StatusData = {
  subscription: {
    id: string;
    status: string;
    provider: string | null;
    activeUntil: string | null;
    graceUntil: string | null;
    plan: { name: string; price: string };
  };
  paymentOptions: {
    mercadoPago: boolean;
    manualPix: boolean;
    pix: {
      key: string;
      keyType: string | null;
      recipientName: string | null;
      city: string | null;
      instructions: string | null;
    } | null;
  };
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amount: string;
    planName: string;
    createdAt: string;
    paidAt: string | null;
    externalReference: string;
  }>;
};

type PixResult = {
  payment: { id: string; externalReference: string; amount: string; status: string; dueAt: string | null };
  pix: { key: string; keyType: string | null; recipientName: string | null; city: string | null; instructions: string | null };
};

const planInfo = {
  Pro: { price: "69,90", label: "Pro", description: "Campanhas, UTM, relatórios, senha, validade e branding." },
  Business: { price: "149,90", label: "Business", description: "Lote, Smart Redirect, domínio próprio, integrações, API e webhooks." },
} as const;

export default function BillingClient({
  initialPlan,
  checkoutReturn,
}: {
  initialPlan?: "Pro" | "Business";
  checkoutReturn: boolean;
}) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(checkoutReturn ? "Retorno recebido. A liberação ocorre assim que o Mercado Pago confirmar o status por webhook." : "");
  const [pix, setPix] = useState<PixResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível carregar sua assinatura.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar cobrança.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function checkout(planName: "Pro" | "Business") {
    setAction(`mp-${planName}`); setError(""); setMessage("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível iniciar o Mercado Pago.");
      window.location.href = payload.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no checkout.");
      setAction("");
    }
  }

  async function manualPix(planName: "Pro" | "Business") {
    setAction(`pix-${planName}`); setError(""); setMessage("");
    try {
      const response = await fetch("/api/billing/manual-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível criar o pedido PIX.");
      setPix(payload);
      setMessage(payload.message || "PIX criado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar PIX.");
    } finally {
      setAction("");
    }
  }

  async function cancel() {
    if (!window.confirm("Cancelar sua assinatura paga?")) return;
    setAction("cancel"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível cancelar.");
      setMessage(payload.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar.");
    } finally {
      setAction("");
    }
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
    setMessage("Chave PIX copiada.");
  }

  return <main className="shell py-8 sm:py-10 md:py-14">
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4 mb-7 sm:mb-8">
      <div><span className="badge">Assinatura e pagamentos</span><h1 className="text-3xl md:text-4xl font-black mt-3">Gerencie seu plano</h1><p className="muted mt-2 leading-relaxed">Mercado Pago para recorrência automática ou PIX como alternativa.</p></div>
      <Link href="/dashboard" className="btn-secondary w-full sm:w-auto">Voltar ao dashboard</Link>
    </div>

    {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

    {loading && !data ? <div className="card p-6 sm:p-8 muted">Carregando...</div> : data && <>
      <section className="card p-5 sm:p-6 mb-7 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-5">
        <div><div className="muted text-sm font-bold">Plano atual</div><div className="text-3xl font-black mt-1">{data.subscription.plan.name}</div><div className="muted text-sm mt-2">Status: {data.subscription.status}{data.subscription.provider ? ` · ${data.subscription.provider}` : ""}</div></div>
        {data.subscription.plan.name !== "Gratuito" && <button onClick={()=>void cancel()} disabled={action === "cancel"} className="btn-secondary !text-rose-300 w-full sm:w-auto">{action === "cancel" ? "Cancelando..." : "Cancelar assinatura"}</button>}
      </section>

      <section className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-7">
        {(Object.keys(planInfo) as Array<keyof typeof planInfo>).map((name) => {
          const plan = planInfo[name];
          const highlighted = initialPlan === name;
          return <article key={name} className={`card p-5 sm:p-7 ${highlighted ? "ring-2 ring-emerald-300/70" : ""}`}>
            <h2 className="text-2xl font-black">{plan.label}</h2>
            <div className="mt-3 flex flex-wrap items-end gap-1"><span className="text-3xl sm:text-4xl font-black">R$ {plan.price}</span><span className="muted pb-1">/mês</span></div>
            <p className="muted mt-3 leading-relaxed">{plan.description}</p>
            <div className="grid gap-2 sm:grid-cols-2 mt-6">
              <button disabled={!data.paymentOptions.mercadoPago || !!action} className="btn-primary w-full" onClick={()=>void checkout(name)}>
                {action === `mp-${name}` ? "Abrindo..." : "Assinar com Mercado Pago"}
              </button>
              <button disabled={!data.paymentOptions.manualPix || !!action} className="btn-secondary w-full" onClick={()=>void manualPix(name)}>
                {action === `pix-${name}` ? "Gerando..." : "Pagar via PIX fixo"}
              </button>
            </div>
            {!data.paymentOptions.mercadoPago && <p className="muted text-xs mt-3">Mercado Pago ainda não configurado pelo administrador.</p>}
          </article>;
        })}
      </section>

      {pix && <section className="card p-5 sm:p-6 mb-7 border-emerald-300/30">
        <span className="badge">PIX manual</span>
        <h2 className="text-xl font-black mt-3">Pagamento de R$ {Number(pix.payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
        <p className="muted text-sm mt-2 leading-relaxed">Após pagar, a confirmação será feita no painel administrativo. Seu plano é liberado sem alterar QR Codes ou métricas existentes.</p>
        <div className="rounded-xl bg-black/20 border border-white/10 p-4 mt-5">
          <div className="muted text-xs font-bold">Chave PIX {pix.pix.keyType ? `· ${pix.pix.keyType}` : ""}</div>
          <div className="font-mono break-all mt-1">{pix.pix.key}</div>
          <button onClick={()=>copy(pix.pix.key)} className="btn-secondary !py-2 mt-3 w-full sm:w-auto">Copiar chave</button>
          {pix.pix.recipientName && <div className="muted text-sm mt-3">Recebedor: {pix.pix.recipientName}{pix.pix.city ? ` · ${pix.pix.city}` : ""}</div>}
          <div className="muted text-xs mt-3 break-all">Referência: {pix.payment.externalReference}</div>
        </div>
        {pix.pix.instructions && <p className="muted text-sm mt-4 whitespace-pre-wrap">{pix.pix.instructions}</p>}
      </section>}

      <section className="card p-4 sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Histórico de pagamentos</h2><p className="muted text-xs mt-1 sm:hidden">Deslize a tabela para o lado para ver todos os dados.</p></div></div>
        <div className="overflow-x-auto mt-4 pb-1">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="muted text-left border-b border-white/10"><tr><th className="pb-3">Data</th><th className="pb-3">Plano</th><th className="pb-3">Método</th><th className="pb-3">Status</th><th className="pb-3 text-right">Valor</th></tr></thead>
            <tbody>{data.payments.map((payment)=><tr key={payment.id} className="border-b border-white/5 last:border-0"><td className="py-3">{new Date(payment.createdAt).toLocaleDateString("pt-BR")}</td><td>{payment.planName}</td><td>{payment.provider === "MANUAL_PIX" ? "PIX" : "Mercado Pago"}</td><td>{payment.status}</td><td className="text-right">R$ {Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>)}
            {data.payments.length === 0 && <tr><td colSpan={5} className="py-8 text-center muted">Nenhum pagamento registrado.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </>}
  </main>;
}

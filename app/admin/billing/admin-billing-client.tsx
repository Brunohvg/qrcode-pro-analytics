"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Settings = {
  mercadoPagoEnabled: boolean;
  manualPixEnabled: boolean;
  pixKey: string | null;
  pixKeyType: string | null;
  pixRecipientName: string | null;
  pixCity: string | null;
  manualPixInstructions: string | null;
  gracePeriodDays: number;
};

type Customer = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  plan: string;
  subscriptionStatus: string | null;
  provider: string | null;
  activeUntil: string | null;
  graceUntil: string | null;
  qrCount: number;
  lifetimeScans: number;
  scans30: number;
  lastScan: string | null;
  revenue: string;
};

type Payment = {
  id: string;
  email: string;
  planName: string;
  provider: string;
  status: string;
  amount: string;
  externalReference: string;
  method: string | null;
  paidAt: string | null;
  dueAt: string | null;
  createdAt: string;
  reviewNote: string | null;
};

type Overview = {
  integration: { mercadoPagoAccessToken: boolean; mercadoPagoWebhookSecret: boolean };
  settings: Settings;
  summary: { customers: number; activePaid: number; pastDue: number; pendingManualPix: number; mrr: string; scans30: number };
  customers: Customer[];
  payments: Payment[];
};

export default function AdminBillingClient({ adminEmail }: { adminEmail: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/billing/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível carregar o painel.");
      setData(payload);
      setSettings(payload.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const customers = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (!term) return data.customers;
    return data.customers.filter((item) => item.email.toLowerCase().includes(term) || item.plan.toLowerCase().includes(term));
  }, [data, search]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving("settings"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/billing/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Falha ao salvar.");
      setMessage("Configurações de cobrança salvas.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving("");
    }
  }

  async function reviewPayment(paymentId: string, action: "approve" | "reject") {
    const note = window.prompt(action === "approve" ? "Observação da aprovação (opcional):" : "Motivo da recusa:") ?? "";
    if (action === "reject" && !note.trim()) return;
    setSaving(paymentId); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/billing/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action, note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Falha ao revisar pagamento.");
      setMessage(payload.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao revisar.");
    } finally {
      setSaving("");
    }
  }

  async function grant(customer: Customer) {
    const planName = window.prompt("Plano: Gratuito, Pro, Business ou Enterprise", customer.plan === "Sem plano" ? "Pro" : customer.plan);
    if (!planName || !["Gratuito", "Pro", "Business", "Enterprise"].includes(planName)) return;
    const daysRaw = planName === "Gratuito" ? "30" : window.prompt("Quantos dias deseja liberar?", "30");
    if (!daysRaw) return;
    const days = Number(daysRaw);
    if (!Number.isInteger(days) || days < 1) return;
    setSaving(customer.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/billing/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id, planName, days }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Falha ao liberar plano.");
      setMessage(payload.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao liberar plano.");
    } finally {
      setSaving("");
    }
  }

  return <main className="shell py-10 md:py-14">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div><span className="badge">Backoffice do SaaS</span><h1 className="text-3xl md:text-4xl font-black mt-3">Cobrança e clientes</h1><p className="muted mt-2">{adminEmail}</p></div>
      <div className="flex gap-2"><Link href="/dashboard/analytics" className="btn-secondary">Analytics</Link><Link href="/dashboard" className="btn-secondary">Dashboard</Link></div>
    </div>

    {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

    {loading && !data ? <div className="card p-8 muted">Carregando backoffice...</div> : data && settings && <>
      <section className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-7">
        {[
          ["Clientes", data.summary.customers],
          ["Pagantes ativos", data.summary.activePaid],
          ["Em atraso", data.summary.pastDue],
          ["PIX para revisar", data.summary.pendingManualPix],
          ["MRR estimado", `R$ ${Number(data.summary.mrr).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
          ["Scans 30 dias", data.summary.scans30],
        ].map(([label, value]) => <div key={String(label)} className="card p-5"><div className="muted text-xs font-bold">{label}</div><div className="text-2xl font-black mt-2">{value}</div></div>)}
      </section>

      <section className="grid xl:grid-cols-[.9fr_1.1fr] gap-6 mb-7">
        <form onSubmit={saveSettings} className="card p-6">
          <h2 className="text-xl font-black">Configuração de pagamentos</h2>
          <div className="mt-5 grid gap-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><strong>Mercado Pago</strong><span className="block muted text-xs">Checkout recorrente</span></span><input type="checkbox" checked={settings.mercadoPagoEnabled} onChange={(e)=>setSettings({...settings, mercadoPagoEnabled:e.target.checked})}/></label>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className={`rounded-xl border p-3 ${data.integration.mercadoPagoAccessToken ? "border-emerald-400/30" : "border-rose-400/30"}`}>Access Token: <strong>{data.integration.mercadoPagoAccessToken ? "configurado" : "faltando"}</strong></div>
              <div className={`rounded-xl border p-3 ${data.integration.mercadoPagoWebhookSecret ? "border-emerald-400/30" : "border-rose-400/30"}`}>Webhook Secret: <strong>{data.integration.mercadoPagoWebhookSecret ? "configurado" : "faltando"}</strong></div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span><strong>PIX fixo</strong><span className="block muted text-xs">Pagamento manual com aprovação sua</span></span><input type="checkbox" checked={settings.manualPixEnabled} onChange={(e)=>setSettings({...settings, manualPixEnabled:e.target.checked})}/></label>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input" placeholder="Chave PIX" value={settings.pixKey ?? ""} onChange={(e)=>setSettings({...settings,pixKey:e.target.value || null})}/>
              <select className="input" value={settings.pixKeyType ?? ""} onChange={(e)=>setSettings({...settings,pixKeyType:e.target.value || null})}><option value="">Tipo da chave</option><option>CPF</option><option>CNPJ</option><option>E-mail</option><option>Telefone</option><option>Aleatória</option></select>
              <input className="input" placeholder="Nome do recebedor" value={settings.pixRecipientName ?? ""} onChange={(e)=>setSettings({...settings,pixRecipientName:e.target.value || null})}/>
              <input className="input" placeholder="Cidade" value={settings.pixCity ?? ""} onChange={(e)=>setSettings({...settings,pixCity:e.target.value || null})}/>
            </div>
            <textarea className="input min-h-24" placeholder="Instruções para PIX manual" value={settings.manualPixInstructions ?? ""} onChange={(e)=>setSettings({...settings,manualPixInstructions:e.target.value || null})}/>
            <label className="text-sm font-bold">Dias de carência após falha de cobrança<input className="input mt-2" type="number" min={0} max={30} value={settings.gracePeriodDays} onChange={(e)=>setSettings({...settings,gracePeriodDays:Number(e.target.value)})}/></label>
            <button className="btn-primary" disabled={saving === "settings"}>{saving === "settings" ? "Salvando..." : "Salvar configuração"}</button>
          </div>
        </form>

        <section className="card p-6">
          <h2 className="text-xl font-black">PIX aguardando revisão</h2>
          <p className="muted text-sm mt-1">Somente PIX fixo exige sua aprovação manual.</p>
          <div className="space-y-3 mt-5">
            {data.payments.filter((payment)=>payment.provider === "MANUAL_PIX" && ["PENDING","IN_REVIEW"].includes(payment.status)).map((payment)=><div key={payment.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-3"><div><div className="font-bold">{payment.email}</div><div className="muted text-xs mt-1">{payment.planName} · {payment.externalReference}</div></div><div className="font-black">R$ {Number(payment.amount).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div></div><div className="flex gap-2 mt-4"><button className="btn-primary !py-2" disabled={saving===payment.id} onClick={()=>void reviewPayment(payment.id,"approve")}>Aprovar</button><button className="btn-secondary !py-2 !text-rose-300" disabled={saving===payment.id} onClick={()=>void reviewPayment(payment.id,"reject")}>Recusar</button></div></div>)}
            {data.payments.filter((payment)=>payment.provider === "MANUAL_PIX" && ["PENDING","IN_REVIEW"].includes(payment.status)).length === 0 && <div className="muted py-8 text-center">Nenhum PIX aguardando revisão.</div>}
          </div>
        </section>
      </section>

      <section className="card p-6 mb-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-black">Clientes e uso</h2><p className="muted text-sm mt-1">Libere planos e acompanhe quem realmente usa QR Codes e métricas.</p></div><input className="input !w-auto min-w-64" placeholder="Buscar cliente..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div>
        <div className="overflow-x-auto mt-5">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="muted text-left border-b border-white/10"><tr><th className="pb-3">Cliente</th><th className="pb-3">Plano</th><th className="pb-3">Financeiro</th><th className="pb-3 text-right">QRs</th><th className="pb-3 text-right">Scans 30d</th><th className="pb-3 text-right">Histórico</th><th className="pb-3">Último scan</th><th className="pb-3 text-right">Receita</th><th className="pb-3"/></tr></thead>
            <tbody>{customers.map((customer)=><tr key={customer.id} className="border-b border-white/5 last:border-0"><td className="py-3 pr-3"><div className="font-bold">{customer.email}</div><div className="muted text-xs">{new Date(customer.createdAt).toLocaleDateString("pt-BR")}</div></td><td>{customer.plan}</td><td>{customer.subscriptionStatus ?? "—"}{customer.provider ? <div className="muted text-xs">{customer.provider}</div> : null}</td><td className="text-right">{customer.qrCount}</td><td className="text-right font-bold">{customer.scans30}</td><td className="text-right">{customer.lifetimeScans}</td><td>{customer.lastScan ? new Date(customer.lastScan).toLocaleDateString("pt-BR") : "—"}</td><td className="text-right">R$ {Number(customer.revenue).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td><td className="text-right"><button className="btn-secondary !py-1.5 !px-2.5 text-xs" disabled={saving===customer.id} onClick={()=>void grant(customer)}>Liberar plano</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-black">Últimos pagamentos</h2>
        <div className="overflow-x-auto mt-4"><table className="w-full min-w-[800px] text-sm"><thead className="muted text-left border-b border-white/10"><tr><th className="pb-3">Data</th><th className="pb-3">Cliente</th><th className="pb-3">Plano</th><th className="pb-3">Provedor</th><th className="pb-3">Status</th><th className="pb-3 text-right">Valor</th></tr></thead><tbody>{data.payments.map((payment)=><tr key={payment.id} className="border-b border-white/5"><td className="py-3">{new Date(payment.createdAt).toLocaleDateString("pt-BR")}</td><td>{payment.email}</td><td>{payment.planName}</td><td>{payment.provider}</td><td>{payment.status}</td><td className="text-right">R$ {Number(payment.amount).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td></tr>)}</tbody></table></div>
      </section>
    </>}
  </main>;
}

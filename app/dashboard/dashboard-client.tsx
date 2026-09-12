"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Campaign = { id: string; name: string; color: string };
type QrItem = { id: string; name: string; originalUrl: string; slug: string; scanCount: number; createdAt: string; updatedAt: string; campaignId: string | null; campaign: Campaign | null };
type Plan = {
  name: string; qrLimit: number; dynamicLinks: boolean; analyticsDays: number; customBranding: boolean; campaigns: boolean;
  scheduledLinks: boolean; passwordProtection: boolean; reports: boolean; bulkGeneration: boolean; smartRedirect: boolean;
  customDomains: boolean; integrations: boolean; apiAccess: boolean; webhooks: boolean; teamSeats: number;
};
type Metrics = { totalScans: number; qrCount: number; ios: { count: number; percent: number }; android: { count: number; percent: number }; desktop: { count: number; percent: number } };
type Notification = { id: string; title: string; message: string; readAt: string | null; createdAt: string; qrCodeId: string | null };
type EditState = { id: string; name: string; originalUrl: string } | null;

type Props = { email: string; initialName?: string; initialUrl?: string; initialCampaignId?: string };

export default function DashboardClient({ email, initialName = "", initialUrl = "", initialCampaignId = "" }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<QrItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [form, setForm] = useState({ name: initialName, originalUrl: initialUrl, campaignId: initialCampaignId });
  const [edit, setEdit] = useState<EditState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(initialUrl ? "Link recebido da ferramenta. Revise o nome e crie seu QR dinâmico." : "");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [qrRes, metricsRes, campaignRes, notificationRes] = await Promise.all([
        fetch("/api/qrcodes", { cache: "no-store" }),
        fetch("/api/dashboard/metrics", { cache: "no-store" }),
        fetch("/api/campaigns", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
      ]);
      if (qrRes.status === 401) { router.push("/login"); return; }
      const [qrData, metricsData, campaignData, notificationData] = await Promise.all([
        qrRes.json(), metricsRes.json(), campaignRes.json(), notificationRes.json(),
      ]);
      if (!qrRes.ok) throw new Error(qrData.message || "Falha ao carregar QR Codes.");
      setItems(qrData.items); setPlan(qrData.plan);
      if (metricsRes.ok) setMetrics(metricsData.metrics);
      if (campaignRes.ok) setCampaigns(campaignData.items ?? []);
      if (notificationRes.ok) { setNotifications(notificationData.items ?? []); setUnread(notificationData.unread ?? 0); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (initialCampaignId && campaigns.some((campaign)=>campaign.id === initialCampaignId)) {
      setForm((current)=>({...current,campaignId:initialCampaignId}));
    }
  }, [campaigns, initialCampaignId]);

  async function createQr(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/qrcodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, campaignId: form.campaignId || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao criar QR Code.");
      setForm({ name: "", originalUrl: "", campaignId: "" }); setMessage("QR Code criado. Agora você pode configurar UTM, validade, senha e personalização."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao criar QR Code."); }
    finally { setSaving(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!edit) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/qrcodes/${edit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: edit.name, originalUrl: edit.originalUrl }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Falha ao salvar.");
      setEdit(null); setMessage("Destino atualizado. O QR Code impresso continua o mesmo."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao atualizar."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este QR Code e todas as métricas?")) return;
    const response = await fetch(`/api/qrcodes/${id}`, { method: "DELETE" });
    if (response.ok) { setMessage("QR Code excluído."); await refresh(); }
    else { const data = await response.json(); setError(data.message || "Falha ao excluir."); }
  }

  async function markNotificationsRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    await refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh();
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const cards = metrics ? [
    ["Total de scans", metrics.totalScans, "Todos os QR Codes"],
    ["iOS", `${metrics.ios.percent}%`, `${metrics.ios.count} scans`],
    ["Android", `${metrics.android.percent}%`, `${metrics.android.count} scans`],
    ["Desktop", `${metrics.desktop.percent}%`, `${metrics.desktop.count} scans`],
  ] : [];

  const tools = useMemo(() => [
    { title: "WhatsApp", text: "Monte links com mensagem pronta.", href: "/ferramentas/whatsapp", enabled: true },
    { title: "Campanhas", text: "Agrupe QRs e organize ações.", href: "/dashboard/campanhas", enabled: Boolean(plan?.campaigns) },
    { title: "Lote CSV", text: "Crie até 200 QRs por importação.", href: "/dashboard/lote", enabled: Boolean(plan?.bulkGeneration) },
    { title: "Relatórios", text: "CSV e impressão para PDF.", href: "/dashboard/relatorios", enabled: Boolean(plan?.reports) },
    { title: "Integrações", text: "Domínio, API, webhooks, GA4 e Meta.", href: "/dashboard/configuracoes", enabled: Boolean(plan?.customDomains || plan?.apiAccess || plan?.integrations) },
  ], [plan]);

  return <main className="shell py-10 md:py-14">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div><span className="badge">{plan?.name || "Carregando plano"}</span><h1 className="text-3xl md:text-4xl font-black mt-3">Dashboard</h1><p className="muted mt-1">{email}</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/planos" className="btn-secondary">Planos</Link><button onClick={logout} className="btn-secondary">Sair</button></div>
    </div>

    {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

    {unread > 0 && <section className="card p-5 mb-6 border-emerald-300/30"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black">{unread} {unread === 1 ? "notificação nova" : "notificações novas"}</div><p className="muted text-sm mt-1">{notifications.find((item)=>!item.readAt)?.title}</p></div><button className="btn-secondary !py-2" onClick={()=>void markNotificationsRead()}>Marcar como lidas</button></div></section>}

    <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      {cards.map(([label,value,help]) => <div key={String(label)} className="card p-5"><div className="muted text-sm font-bold">{label}</div><div className="text-3xl font-black mt-2">{value}</div><div className="muted text-xs mt-2">{help}</div></div>)}
      {!metrics && Array.from({length:4}).map((_,i)=><div key={i} className="card p-5 h-28 animate-pulse" />)}
    </section>

    <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-7">
      {tools.map((tool)=><Link key={tool.title} href={tool.enabled ? tool.href : "/planos"} className={`card p-4 hover:border-emerald-300/30 transition ${tool.enabled ? "" : "opacity-60"}`}><div className="flex items-center justify-between gap-2"><h2 className="font-black">{tool.title}</h2>{!tool.enabled && <span className="text-[10px] badge">Upgrade</span>}</div><p className="muted text-xs mt-2 leading-relaxed">{tool.text}</p></Link>)}
    </section>

    <section className="card p-6 md:p-7 mb-7">
      <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="font-black text-xl">Criar QR Code</h2><p className="muted text-sm mt-1">O destino pode ser alterado depois sem reimprimir o código.</p></div>{plan && <span className="muted text-sm">{plan.qrLimit < 0 ? "Ilimitado" : `${items.length}/${plan.qrLimit}`}</span>}</div>
      <form onSubmit={createQr} className={`grid gap-3 ${plan?.campaigns ? "lg:grid-cols-[.7fr_1.25fr_.65fr_auto]" : "md:grid-cols-[.75fr_1.5fr_auto]"}`}>
        <input className="input" placeholder="Nome do QR Code" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required minLength={2} maxLength={80} />
        <input className="input" placeholder="https://seusite.com/pagina" type="url" value={form.originalUrl} onChange={(e)=>setForm({...form,originalUrl:e.target.value})} required />
        {plan?.campaigns && <select className="input" value={form.campaignId} onChange={(e)=>setForm({...form,campaignId:e.target.value})}><option value="">Sem campanha</option>{campaigns.map((campaign)=><option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>}
        <button className="btn-primary" disabled={saving}>{saving ? "Criando..." : "Criar QR"}</button>
      </form>
      <div className="mt-4 text-xs muted">Não tem o link ainda? <Link className="text-emerald-300 font-bold" href="/ferramentas/whatsapp">Gere um link de WhatsApp com mensagem pronta.</Link></div>
    </section>

    <section>
      <div className="flex items-end justify-between gap-4 mb-4"><div><h2 className="text-xl font-black">Meus QR Codes</h2><p className="muted text-sm mt-1">Configure campanhas, regras e impressão sem alterar o QR já distribuído.</p></div></div>
      {loading ? <div className="card p-8 muted">Carregando...</div> : items.length === 0 ? <div className="card p-10 text-center"><div className="text-xl font-black">Nenhum QR Code ainda</div><p className="muted mt-2">Crie o primeiro usando o formulário acima.</p></div> : <div className="grid xl:grid-cols-2 gap-4">
        {items.map((item) => <article key={item.id} className="card p-5 grid sm:grid-cols-[118px_1fr] gap-5 items-start">
          <img src={`/api/qrcodes/${item.id}/image`} alt={`QR Code ${item.name}`} width={118} height={118} className="rounded-xl bg-white p-1 mx-auto sm:mx-0" />
          <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h3 className="font-extrabold truncate">{item.name}</h3>{item.campaign && <div className="flex items-center gap-2 mt-1"><span className="size-2 rounded-full" style={{backgroundColor:item.campaign.color}}/><span className="muted text-xs">{item.campaign.name}</span></div>}</div><span className="badge">{item.scanCount} scans</span></div>
            <p className="muted text-sm mt-2 truncate" title={item.originalUrl}>{item.originalUrl}</p>
            <p className="text-xs text-emerald-300 mt-2 break-all">{appUrl}/r/{item.slug}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link className="btn-primary !py-2 !px-3 text-sm" href={`/dashboard/qrcodes/${item.id}`}>Configurar</Link>
              <button className="btn-secondary !py-2 !px-3 text-sm" onClick={()=>setEdit({id:item.id,name:item.name,originalUrl:item.originalUrl})}>Editar destino</button>
              <Link className="btn-secondary !py-2 !px-3 text-sm" href={`/dashboard/analytics/${item.id}`}>Analytics</Link>
              <Link className="btn-secondary !py-2 !px-3 text-sm" href={`/dashboard/qrcodes/${item.id}/print`}>Imprimir</Link>
              <a className="btn-secondary !py-2 !px-3 text-sm" href={`/api/qrcodes/${item.id}/image?download=1`}>QR puro</a>
              <button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void remove(item.id)}>Excluir</button>
            </div>
          </div>
        </article>)}
      </div>}
    </section>

    {edit && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={()=>setEdit(null)}><form onSubmit={saveEdit} onMouseDown={(event)=>event.stopPropagation()} className="card w-full max-w-lg p-7">
      <h2 className="text-xl font-black">Editar rapidamente</h2><p className="muted text-sm mt-1">Para UTM, senha, validade e Smart Redirect use “Configurar”.</p>
      <label className="block text-sm font-bold mt-5">Nome<input className="input mt-2" value={edit.name} onChange={(e)=>setEdit({...edit,name:e.target.value})} required /></label>
      <label className="block text-sm font-bold mt-4">URL de destino<input className="input mt-2" type="url" value={edit.originalUrl} onChange={(e)=>setEdit({...edit,originalUrl:e.target.value})} required /></label>
      <div className="flex justify-end gap-2 mt-6"><button type="button" className="btn-secondary" onClick={()=>setEdit(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>Salvar</button></div>
    </form></div>}
  </main>;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type QrItem = { id: string; name: string; originalUrl: string; slug: string; scanCount: number; createdAt: string; updatedAt: string };
type Plan = { name: string; qrLimit: number; dynamicLinks: boolean };
type Metrics = { totalScans: number; qrCount: number; ios: { count: number; percent: number }; android: { count: number; percent: number }; desktop: { count: number; percent: number } };

type EditState = { id: string; name: string; originalUrl: string } | null;

export default function DashboardClient({ email }: { email: string }) {
  const router = useRouter();
  const [items, setItems] = useState<QrItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [form, setForm] = useState({ name: "", originalUrl: "" });
  const [edit, setEdit] = useState<EditState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [qrRes, metricsRes] = await Promise.all([fetch("/api/qrcodes", { cache: "no-store" }), fetch("/api/dashboard/metrics", { cache: "no-store" })]);
      if (qrRes.status === 401) { router.push("/login"); return; }
      const qrData = await qrRes.json();
      const metricsData = await metricsRes.json();
      if (!qrRes.ok) throw new Error(qrData.message || "Falha ao carregar QR Codes.");
      setItems(qrData.items); setPlan(qrData.plan);
      if (metricsRes.ok) setMetrics(metricsData.metrics);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar o painel."); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createQr(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/qrcodes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao criar QR Code.");
      setForm({ name: "", originalUrl: "" }); setMessage("QR Code criado com sucesso."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao criar QR Code."); }
    finally { setSaving(false); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!edit) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/qrcodes/${edit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: edit.name, originalUrl: edit.originalUrl }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Falha ao salvar.");
      setEdit(null); setMessage("QR Code atualizado. O código impresso continua o mesmo."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao atualizar."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este QR Code e todas as métricas?")) return;
    const response = await fetch(`/api/qrcodes/${id}`, { method: "DELETE" });
    if (response.ok) { setMessage("QR Code excluído."); await refresh(); }
    else { const data = await response.json(); setError(data.message || "Falha ao excluir."); }
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

  return <main className="shell py-10 md:py-14">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div><span className="badge">{plan?.name || "Carregando plano"}</span><h1 className="text-3xl md:text-4xl font-black mt-3">Dashboard</h1><p className="muted mt-1">{email}</p></div>
      <div className="flex gap-2"><Link href="/planos" className="btn-secondary">Planos</Link><button onClick={logout} className="btn-secondary">Sair</button></div>
    </div>

    {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

    <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      {cards.map(([label,value,help]) => <div key={String(label)} className="card p-5"><div className="muted text-sm font-bold">{label}</div><div className="text-3xl font-black mt-2">{value}</div><div className="muted text-xs mt-2">{help}</div></div>)}
      {!metrics && Array.from({length:4}).map((_,i)=><div key={i} className="card p-5 h-28 animate-pulse" />)}
    </section>

    <section className="card p-6 md:p-7 mb-7">
      <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="font-black text-xl">Criar QR Code</h2><p className="muted text-sm mt-1">O QR apontará para uma rota rastreável antes do destino final.</p></div>{plan && <span className="muted text-sm">{plan.qrLimit < 0 ? "Ilimitado" : `${items.length}/${plan.qrLimit}`}</span>}</div>
      <form onSubmit={createQr} className="grid md:grid-cols-[.75fr_1.5fr_auto] gap-3">
        <input className="input" placeholder="Nome do QR Code" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required minLength={2} maxLength={80} />
        <input className="input" placeholder="https://seusite.com/pagina" type="url" value={form.originalUrl} onChange={e=>setForm({...form,originalUrl:e.target.value})} required />
        <button className="btn-primary" disabled={saving}>{saving ? "Criando..." : "Criar QR"}</button>
      </form>
    </section>

    <section>
      <div className="flex items-end justify-between gap-4 mb-4"><div><h2 className="text-xl font-black">Meus QR Codes</h2><p className="muted text-sm mt-1">Edite o destino sem alterar o QR já distribuído.</p></div></div>
      {loading ? <div className="card p-8 muted">Carregando...</div> : items.length === 0 ? <div className="card p-10 text-center"><div className="text-xl font-black">Nenhum QR Code ainda</div><p className="muted mt-2">Crie o primeiro usando o formulário acima.</p></div> : <div className="grid lg:grid-cols-2 gap-4">
        {items.map(item => <article key={item.id} className="card p-5 grid grid-cols-[108px_1fr] gap-5 items-start">
          <img src={`/api/qrcodes/${item.id}/image`} alt={`QR Code ${item.name}`} width={108} height={108} className="rounded-xl bg-white p-1" />
          <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-extrabold truncate">{item.name}</h3><span className="badge">{item.scanCount} scans</span></div>
            <p className="muted text-sm mt-2 truncate" title={item.originalUrl}>{item.originalUrl}</p>
            <p className="text-xs text-emerald-300 mt-2 break-all">{appUrl}/r/{item.slug}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn-secondary !py-2 !px-3 text-sm" onClick={()=>setEdit({id:item.id,name:item.name,originalUrl:item.originalUrl})}>Editar</button>
              <Link className="btn-secondary !py-2 !px-3 text-sm" href={`/dashboard/analytics/${item.id}`}>Analytics</Link>
              <a className="btn-secondary !py-2 !px-3 text-sm" href={`/api/qrcodes/${item.id}/image?download=1`}>Baixar SVG</a>
              <button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void remove(item.id)}>Excluir</button>
            </div>
          </div>
        </article>)}
      </div>}
    </section>

    {edit && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={()=>setEdit(null)}><form onSubmit={saveEdit} onMouseDown={e=>e.stopPropagation()} className="card w-full max-w-lg p-7">
      <h2 className="text-xl font-black">Editar QR Code</h2><p className="muted text-sm mt-1">Mudar o destino não exige reimpressão.</p>
      <label className="block text-sm font-bold mt-5">Nome<input className="input mt-2" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} required /></label>
      <label className="block text-sm font-bold mt-4">URL de destino<input className="input mt-2" type="url" value={edit.originalUrl} onChange={e=>setEdit({...edit,originalUrl:e.target.value})} required /></label>
      <div className="flex justify-end gap-2 mt-6"><button type="button" className="btn-secondary" onClick={()=>setEdit(null)}>Cancelar</button><button className="btn-primary" disabled={saving}>Salvar</button></div>
    </form></div>}
  </main>;
}

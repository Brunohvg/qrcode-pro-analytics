"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { qrCodes: number };
};

export default function CampaignsClient() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", color: "#34d399" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/campaigns", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao carregar campanhas.");
      setItems(data.items);
      setEnabled(Boolean(data.enabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar campanhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createCampaign(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao criar campanha.");
      setForm({ name: "", description: "", color: "#34d399" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar campanha.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir esta campanha? Os QR Codes continuarão existindo sem campanha.")) return;
    const response = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) setError(data.message || "Falha ao excluir campanha.");
    else await load();
  }

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <span className="badge">Organização</span>
          <h1 className="text-3xl md:text-4xl font-black mt-3">Campanhas</h1>
          <p className="muted mt-2 max-w-2xl">Agrupe QR Codes por ação, cliente, loja ou período e acompanhe cada iniciativa separadamente.</p>
        </div>
        <Link className="btn-secondary" href="/dashboard">Voltar ao dashboard</Link>
      </div>

      {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}

      {!enabled && !loading && (
        <div className="card p-6 mb-7 border-amber-300/30">
          <div className="font-extrabold">Campanhas fazem parte do plano Pro ou superior.</div>
          <p className="muted mt-2 text-sm">Faça upgrade para organizar QR Codes, usar UTM e construir relatórios por campanha.</p>
          <Link href="/planos" className="btn-primary inline-flex mt-4">Ver planos</Link>
        </div>
      )}

      {enabled && (
        <form onSubmit={createCampaign} className="card p-6 md:p-7 mb-7 grid lg:grid-cols-[1fr_1.4fr_110px_auto] gap-3 items-end">
          <label className="text-sm font-bold">Nome<input className="input mt-2" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required minLength={2} maxLength={80} placeholder="Black Friday" /></label>
          <label className="text-sm font-bold">Descrição<input className="input mt-2" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} maxLength={300} placeholder="QRs das peças e anúncios da campanha" /></label>
          <label className="text-sm font-bold">Cor<input className="input mt-2 !p-2 h-12" type="color" value={form.color} onChange={(e)=>setForm({...form,color:e.target.value})} /></label>
          <button className="btn-primary h-12" disabled={saving}>{saving ? "Criando..." : "Criar campanha"}</button>
        </form>
      )}

      {loading ? <div className="card p-8 muted">Carregando...</div> : items.length === 0 ? (
        <div className="card p-10 text-center"><h2 className="text-xl font-black">Nenhuma campanha ainda</h2><p className="muted mt-2">Crie uma campanha para começar a organizar seus QR Codes.</p></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <article className="card p-6" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0"><span className="size-4 rounded-full shrink-0" style={{ backgroundColor: item.color }} /><h2 className="font-black text-lg truncate">{item.name}</h2></div>
                <span className="badge">{item._count.qrCodes} QRs</span>
              </div>
              <p className="muted text-sm mt-4 min-h-10">{item.description || "Sem descrição."}</p>
              <div className="flex gap-2 mt-5"><Link className="btn-secondary !py-2 !px-3 text-sm" href={`/dashboard?campaign=${item.id}`}>Criar QR</Link><button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void remove(item.id)}>Excluir</button></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

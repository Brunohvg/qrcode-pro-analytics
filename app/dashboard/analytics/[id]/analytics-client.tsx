"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Analytics = {
  qr: { id: string; name: string; originalUrl: string; slug: string; scanCount: number; createdAt: string };
  summary: { last24: number; last30: number; lifetime: number };
  byDay: { label: string; count: number }[];
  byDevice: { label: string; count: number }[];
  byBrowser: { label: string; count: number }[];
  byCountry: { label: string; count: number }[];
  recent: { id: string; device: string; country: string; browser: string; scannedAt: string }[];
};

export default function AnalyticsClient({ id }: { id: string }) {
  const [data, setData] = useState<Analytics | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(()=>{(async()=>{try{const response=await fetch(`/api/analytics/${id}`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.message||"Falha ao carregar analytics.");setData(body);}catch(err){setError(err instanceof Error?err.message:"Falha ao carregar analytics.");}finally{setLoading(false);}})();},[id]);
  if (loading) return <main className="shell py-14"><div className="card p-8 muted">Carregando analytics...</div></main>;
  if (error) return <main className="shell py-14"><div className="card p-8"><h1 className="text-2xl font-black">Analytics indisponível</h1><p className="muted mt-3">{error}</p><div className="flex gap-2 mt-6"><Link href="/dashboard" className="btn-secondary">Voltar</Link><Link href="/planos" className="btn-primary">Ver planos</Link></div></div></main>;
  if (!data) return null;
  const maxDay = Math.max(1, ...data.byDay.map(x=>x.count));
  return <main className="shell py-10 md:py-14"><div className="flex flex-wrap justify-between gap-4 items-start mb-7"><div><Link href="/dashboard" className="muted text-sm">← Dashboard</Link><h1 className="text-3xl font-black mt-2">{data.qr.name}</h1><p className="muted mt-1 truncate max-w-2xl">{data.qr.originalUrl}</p></div><span className="badge">Analytics Pro</span></div>
    <div className="grid md:grid-cols-3 gap-4 mb-5">{[["Últimas 24h",data.summary.last24],["Últimos 30 dias",data.summary.last30],["Total histórico",data.summary.lifetime]].map(([l,v])=><div className="card p-5" key={String(l)}><div className="muted text-sm">{l}</div><div className="text-3xl font-black mt-2">{v}</div></div>)}</div>
    <div className="grid lg:grid-cols-[1.5fr_.8fr] gap-5">
      <section className="card p-6"><h2 className="font-black text-lg">Acessos por dia</h2><div className="mt-6 h-56 flex items-end gap-1.5 border-b border-white/10">{data.byDay.length===0?<p className="muted m-auto">Sem scans nos últimos 30 dias.</p>:data.byDay.map(day=><div key={day.label} className="group flex-1 min-w-1 bg-emerald-300/70 hover:bg-emerald-200 rounded-t relative" style={{height:`${Math.max(4,(day.count/maxDay)*100)}%`}} title={`${day.label}: ${day.count}`} />)}</div></section>
      <section className="card p-6"><h2 className="font-black text-lg">Dispositivos</h2><div className="mt-5 space-y-3">{data.byDevice.length===0?<p className="muted">Sem dados.</p>:data.byDevice.map(row=><div key={row.label} className="flex justify-between border-b border-white/10 pb-3"><span>{row.label}</span><strong>{row.count}</strong></div>)}</div></section>
      <section className="card p-6"><h2 className="font-black text-lg">Navegadores</h2><div className="mt-5 grid sm:grid-cols-2 gap-3">{data.byBrowser.map(row=><div className="rounded-xl border border-white/10 p-3 flex justify-between" key={row.label}><span className="muted">{row.label}</span><strong>{row.count}</strong></div>)}</div></section>
      <section className="card p-6"><h2 className="font-black text-lg">Países</h2><div className="mt-5 grid sm:grid-cols-2 gap-3">{data.byCountry.map(row=><div className="rounded-xl border border-white/10 p-3 flex justify-between" key={row.label}><span className="muted">{row.label}</span><strong>{row.count}</strong></div>)}</div></section>
    </div>
    <section className="card p-6 mt-5 overflow-hidden"><h2 className="font-black text-lg">Últimos scans</h2><div className="overflow-x-auto mt-4"><table className="w-full text-sm min-w-[620px]"><thead className="muted text-left"><tr><th className="py-3">Data</th><th>Dispositivo</th><th>Navegador</th><th>País</th></tr></thead><tbody>{data.recent.map(row=><tr key={row.id} className="border-t border-white/10"><td className="py-3">{new Date(row.scannedAt).toLocaleString("pt-BR")}</td><td>{row.device}</td><td>{row.browser}</td><td>{row.country}</td></tr>)}</tbody></table></div></section>
  </main>;
}

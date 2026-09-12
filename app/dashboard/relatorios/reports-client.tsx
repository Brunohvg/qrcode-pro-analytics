"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Ranked = { name: string; scans: number };
type QrRanked = { id: string; name: string; scans: number };
type Report = {
  totalScans: number;
  analyticsDays: number;
  devices: { IOS: number; ANDROID: number; DESKTOP: number };
  countries: Ranked[];
  browsers: Ranked[];
  qrCodes: QrRanked[];
  generatedAt: string;
};

function RankedList({ title, items }: { title: string; items: Ranked[] }) {
  const max = Math.max(1, ...items.map((item) => item.scans));
  return <section className="card p-6"><h2 className="font-black text-lg">{title}</h2><div className="mt-5 space-y-4">{items.length ? items.map((item)=><div key={item.name}><div className="flex justify-between gap-3 text-sm"><span className="truncate">{item.name}</span><strong>{item.scans}</strong></div><div className="h-2 rounded-full bg-white/8 mt-2 overflow-hidden"><div className="h-full rounded-full bg-emerald-300" style={{width:`${Math.max(4,(item.scans/max)*100)}%`}} /></div></div>) : <p className="muted text-sm">Sem dados no período.</p>}</div></section>;
}

export default function ReportsClient() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/reports", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Falha ao gerar relatório.");
        setReport(data.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao gerar relatório.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <main className="shell py-10 md:py-14 print-shell">
    <style jsx global>{`@media print{header{display:none!important}body{background:#fff!important;color:#111827!important}.print-shell{max-width:none!important;padding:0!important}.no-print{display:none!important}.card{background:#fff!important;color:#111827!important;border:1px solid #e5e7eb!important;box-shadow:none!important}.muted{color:#64748b!important}.bg-emerald-300{background:#111827!important}}`}</style>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div><span className="badge">Analytics</span><h1 className="text-3xl md:text-4xl font-black mt-3">Relatórios</h1><p className="muted mt-2">Exporte os dados em CSV ou use a impressão do navegador para salvar um relatório em PDF.</p></div>
      <div className="flex flex-wrap gap-2 no-print"><a className="btn-secondary" href="/api/reports?format=csv">Baixar CSV</a><button className="btn-primary" onClick={()=>window.print()}>Imprimir / salvar PDF</button><Link className="btn-secondary" href="/dashboard">Voltar</Link></div>
    </div>

    {loading && <div className="card p-8 muted">Gerando relatório...</div>}
    {error && <div className="card p-8 border-rose-400/30 text-rose-200"><div className="font-black">Relatório indisponível</div><p className="mt-2">{error}</p><Link href="/planos" className="btn-primary inline-flex mt-5 no-print">Ver planos</Link></div>}

    {report && <>
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card p-5"><div className="muted text-sm font-bold">Total de scans</div><div className="text-3xl font-black mt-2">{report.totalScans}</div></div>
        <div className="card p-5"><div className="muted text-sm font-bold">iOS</div><div className="text-3xl font-black mt-2">{report.devices.IOS}</div></div>
        <div className="card p-5"><div className="muted text-sm font-bold">Android</div><div className="text-3xl font-black mt-2">{report.devices.ANDROID}</div></div>
        <div className="card p-5"><div className="muted text-sm font-bold">Desktop</div><div className="text-3xl font-black mt-2">{report.devices.DESKTOP}</div></div>
      </section>
      <div className="grid lg:grid-cols-3 gap-5"><RankedList title="Países" items={report.countries}/><RankedList title="Navegadores" items={report.browsers}/><RankedList title="QR Codes" items={report.qrCodes.map((item)=>({name:item.name,scans:item.scans}))}/></div>
      <div className="muted text-xs mt-6">Período: {report.analyticsDays < 0 ? "histórico completo" : `últimos ${report.analyticsDays} dias`} • Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}</div>
    </>}
  </main>;
}

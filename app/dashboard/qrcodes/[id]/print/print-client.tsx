"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  originalUrl: string;
  slug: string;
  scanCount: number;
  foregroundColor: string;
  accentColor: string;
  frameTitle: string | null;
  frameText: string | null;
  brandName: string | null;
  logoUrl: string | null;
};

const PRESETS = ["#10B981", "#0EA5E9", "#7C3AED", "#F97316", "#E11D48", "#111827"];

export default function PrintQrClient({ item }: { item: Item }) {
  const [foreground, setForeground] = useState(item.foregroundColor || "#111827");
  const [accent, setAccent] = useState(item.accentColor || "#10B981");
  const [title, setTitle] = useState(item.frameTitle || item.name);
  const [subtitle, setSubtitle] = useState(item.frameText || "Aponte a câmera do celular para acessar");
  const [brand, setBrand] = useState(item.brandName || "QR Metrics Pro");
  const [logo, setLogo] = useState(item.logoUrl || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ variant: "card", foreground, accent, title, subtitle, brand });
    if (logo) params.set("logo", logo);
    return params.toString();
  }, [accent, brand, foreground, logo, subtitle, title]);

  const previewUrl = `/api/qrcodes/${item.id}/image?${query}`;
  const cardDownloadUrl = `${previewUrl}&download=1`;
  const plainDownloadUrl = `/api/qrcodes/${item.id}/image?variant=plain&foreground=${encodeURIComponent(foreground)}&download=1`;

  async function saveDefaults() {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/qrcodes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foregroundColor: foreground,
          accentColor: accent,
          frameTitle: title || null,
          frameText: subtitle || null,
          brandName: brand || null,
          logoUrl: logo || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível salvar o padrão.");
      setMessage("Identidade visual salva como padrão deste QR.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell py-8 md:py-12">
      <div className="no-print mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/dashboard" className="muted text-sm font-bold hover:text-white">← Voltar ao dashboard</Link><h1 className="mt-3 text-3xl font-black md:text-4xl">Personalizar impressão</h1><p className="muted mt-2 max-w-2xl text-sm">Monte uma peça pronta para impressão. O QR continua dinâmico e o destino pode mudar depois.</p></div>
        <span className="badge">{item.scanCount} scans</span>
      </div>

      {message && <div className="no-print mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}
      {error && <div className="no-print mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="no-print card h-fit p-6">
          <h2 className="text-lg font-black">Personalização</h2>
          <label className="mt-5 block text-sm font-bold">Título<input className="input mt-2" value={title} maxLength={44} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-bold">Texto abaixo do QR<input className="input mt-2" value={subtitle} maxLength={72} onChange={(event) => setSubtitle(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-bold">Marca / identificação<input className="input mt-2" value={brand} maxLength={32} onChange={(event) => setBrand(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-bold">Logo por URL <span className="muted font-normal">(opcional)</span><input className="input mt-2" type="url" value={logo} onChange={(event)=>setLogo(event.target.value)} placeholder="https://seusite.com/logo.png" /></label>

          <div className="mt-5"><div className="text-sm font-bold">Cor de destaque</div><div className="mt-3 flex flex-wrap gap-2">{PRESETS.map((color)=><button type="button" key={color} onClick={()=>setAccent(color)} aria-label={`Usar cor ${color}`} className={`h-9 w-9 rounded-full border-2 ${accent===color?"border-white":"border-white/20"}`} style={{backgroundColor:color}} />)}<label className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white/20" title="Escolher outra cor"><input type="color" value={accent} onChange={(event)=>setAccent(event.target.value.toUpperCase())} className="absolute -inset-2 h-14 w-14 cursor-pointer" /></label></div></div>
          <label className="mt-5 block text-sm font-bold">Cor do QR<input className="input mt-2 !p-2 h-12" type="color" value={foreground} onChange={(event)=>setForeground(event.target.value.toUpperCase())} /><span className="muted text-xs block mt-2">Se a cor ficar clara demais, a plataforma usa preto automaticamente para preservar a leitura.</span></label>

          <div className="mt-6 grid gap-2">
            <button type="button" onClick={()=>window.print()} className="btn-primary w-full">Imprimir cartão</button>
            <a href={cardDownloadUrl} className="btn-secondary w-full text-center">Baixar cartão SVG</a>
            <a href={plainDownloadUrl} className="btn-secondary w-full text-center">Baixar QR puro</a>
            <button type="button" onClick={()=>void saveDefaults()} disabled={saving} className="btn-secondary w-full">{saving ? "Salvando..." : "Salvar como padrão"}</button>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300"><strong>Destino atual:</strong><div className="mt-1 break-all text-slate-400">{item.originalUrl}</div></div>
        </section>

        <section className="card flex min-h-[720px] items-center justify-center overflow-hidden p-5 md:p-8"><div className="print-sheet w-full max-w-[620px]"><img key={previewUrl} src={previewUrl} alt={`Cartão imprimível do QR Code ${item.name}`} className="mx-auto h-auto w-full rounded-[28px] bg-white shadow-2xl" /></div></section>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet { position: fixed !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 100vw !important; height: 100vh !important; max-width: none !important; background: white !important; }
          .print-sheet img { width: 180mm !important; max-height: 270mm !important; object-fit: contain !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </main>
  );
}

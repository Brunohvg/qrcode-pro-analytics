"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

type Item = { name: string; originalUrl: string };

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim()); current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Item[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sample = lines[0];
  const delimiter = sample.includes(";") ? ";" : sample.includes("\t") ? "\t" : ",";
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const first = rows[0].map((value) => value.toLowerCase());
  const hasHeader = first.some((value) => ["nome", "name", "titulo", "título"].includes(value)) && first.some((value) => ["url", "link", "destino"].includes(value));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .filter((row) => row.length >= 2)
    .map((row) => ({ name: row[0].trim(), originalUrl: row[1].trim() }))
    .filter((row) => row.name && row.originalUrl)
    .slice(0, 200);
}

export default function BulkClient() {
  const [text, setText] = useState("Nome,URL\nCatálogo,https://exemplo.com/catalogo\nWhatsApp,https://wa.me/5531999999999");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const items = useMemo(() => parseCsv(text), [text]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { setError("Use um CSV de até 1 MB."); return; }
    setText(await file.text());
    setError("");
  }

  async function createBatch() {
    if (!items.length) { setError("Nenhuma linha válida encontrada."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/qrcodes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao criar lote.");
      setMessage(`${data.count} QR Codes criados com sucesso.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar lote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div><span className="badge">Business</span><h1 className="text-3xl md:text-4xl font-black mt-3">Gerar QR Codes em lote</h1><p className="muted mt-2 max-w-2xl">Importe até 200 links por vez usando CSV. Ideal para produtos, mesas, eventos, etiquetas e campanhas em escala.</p></div>
        <Link href="/dashboard" className="btn-secondary">Voltar ao dashboard</Link>
      </div>

      {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
      {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message} <Link className="font-bold underline" href="/dashboard">Ver QR Codes</Link></div>}

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
        <section className="card p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Arquivo ou conteúdo CSV</h2><p className="muted text-sm mt-1">Colunas: Nome, URL. Aceita vírgula, ponto e vírgula ou tabulação.</p></div><label className="btn-secondary cursor-pointer">Selecionar CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(event)=>void readFile(event)} /></label></div>
          <textarea className="input mt-5 min-h-80 font-mono text-sm resize-y" value={text} onChange={(e)=>setText(e.target.value)} spellCheck={false} />
          <div className="flex items-center justify-between gap-3 mt-4"><span className="muted text-sm">{items.length} linhas válidas</span><button className="btn-primary" disabled={saving || !items.length} onClick={()=>void createBatch()}>{saving ? "Criando..." : `Criar ${items.length} QR Codes`}</button></div>
        </section>

        <aside className="card p-6 md:p-7">
          <h2 className="text-xl font-black">Prévia</h2>
          <div className="mt-5 space-y-3 max-h-[520px] overflow-auto pr-1">
            {items.slice(0, 30).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl border border-white/10 p-3"><div className="font-bold text-sm truncate">{index + 1}. {item.name}</div><div className="muted text-xs mt-1 truncate">{item.originalUrl}</div></div>)}
            {items.length > 30 && <div className="muted text-sm text-center py-3">+ {items.length - 30} itens</div>}
            {!items.length && <p className="muted text-sm">Nenhum item válido ainda.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}

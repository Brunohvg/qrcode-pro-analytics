"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Plan = {
  name: string;
  customBranding: boolean;
  campaigns: boolean;
  scheduledLinks: boolean;
  passwordProtection: boolean;
  smartRedirect: boolean;
  customDomains: boolean;
};

type Campaign = { id: string; name: string; color: string };
type Domain = { id: string; host: string; verifiedAt: string | null };

type QrData = {
  id: string;
  name: string;
  originalUrl: string;
  slug: string;
  scanCount: number;
  campaignId: string | null;
  customDomainId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  activeFrom: string | null;
  expiresAt: string | null;
  fallbackUrl: string | null;
  passwordPrompt: string | null;
  passwordProtected?: boolean;
  iosUrl: string | null;
  androidUrl: string | null;
  desktopUrl: string | null;
  countryRules: Record<string, string> | null;
  notifyAtScans: number | null;
  foregroundColor: string;
  accentColor: string;
  frameTitle: string | null;
  frameText: string | null;
  brandName: string | null;
  logoUrl: string | null;
};

type FormState = {
  name: string;
  originalUrl: string;
  campaignId: string;
  customDomainId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  activeFrom: string;
  expiresAt: string;
  fallbackUrl: string;
  password: string;
  passwordPrompt: string;
  removePassword: boolean;
  iosUrl: string;
  androidUrl: string;
  desktopUrl: string;
  countryRules: string;
  notifyAtScans: string;
  foregroundColor: string;
  accentColor: string;
  frameTitle: string;
  frameText: string;
  brandName: string;
  logoUrl: string;
};

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function rulesToText(rules: Record<string, string> | null): string {
  if (!rules) return "";
  return Object.entries(rules).map(([country, url]) => `${country}=${url}`).join("\n");
}

function parseRules(text: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const index = line.indexOf("=");
    if (index < 2) throw new Error(`Regra inválida: ${line}`);
    const country = line.slice(0, index).trim().toUpperCase();
    const url = line.slice(index + 1).trim();
    if (!/^[A-Z]{2,3}$/.test(country)) throw new Error(`País inválido: ${country}`);
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`URL inválida para ${country}`);
    output[country] = url;
  }
  return output;
}

function toForm(item: QrData): FormState {
  return {
    name: item.name,
    originalUrl: item.originalUrl,
    campaignId: item.campaignId ?? "",
    customDomainId: item.customDomainId ?? "",
    utmSource: item.utmSource ?? "",
    utmMedium: item.utmMedium ?? "",
    utmCampaign: item.utmCampaign ?? "",
    activeFrom: localDateTime(item.activeFrom),
    expiresAt: localDateTime(item.expiresAt),
    fallbackUrl: item.fallbackUrl ?? "",
    password: "",
    passwordPrompt: item.passwordPrompt ?? "",
    removePassword: false,
    iosUrl: item.iosUrl ?? "",
    androidUrl: item.androidUrl ?? "",
    desktopUrl: item.desktopUrl ?? "",
    countryRules: rulesToText(item.countryRules),
    notifyAtScans: item.notifyAtScans ? String(item.notifyAtScans) : "",
    foregroundColor: item.foregroundColor || "#07111f",
    accentColor: item.accentColor || "#34d399",
    frameTitle: item.frameTitle ?? "",
    frameText: item.frameText ?? "",
    brandName: item.brandName ?? "",
    logoUrl: item.logoUrl ?? "",
  };
}

export default function AdvancedQrClient({ id }: { id: string }) {
  const [item, setItem] = useState<QrData | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [qrResponse, campaignResponse, domainResponse] = await Promise.all([
        fetch(`/api/qrcodes/${id}`, { cache: "no-store" }),
        fetch("/api/campaigns", { cache: "no-store" }),
        fetch("/api/settings/domains", { cache: "no-store" }),
      ]);
      const qrData = await qrResponse.json();
      if (!qrResponse.ok) throw new Error(qrData.message || "QR Code não encontrado.");
      const campaignData = campaignResponse.ok ? await campaignResponse.json() : { items: [] };
      const domainData = domainResponse.ok ? await domainResponse.json() : { items: [] };
      setItem(qrData.item);
      setPlan(qrData.plan);
      setForm(toForm(qrData.item));
      setCampaigns(campaignData.items ?? []);
      setDomains(domainData.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const publicLink = useMemo(() => {
    if (!item || typeof window === "undefined") return "";
    const domain = domains.find((domain) => domain.id === form?.customDomainId && domain.verifiedAt);
    return domain ? `https://${domain.host}/r/${item.slug}` : `${window.location.origin}/r/${item.slug}`;
  }, [domains, form?.customDomainId, item]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const countryRules = parseRules(form.countryRules);
      const payload: Record<string, unknown> = {
        name: form.name,
        originalUrl: form.originalUrl,
        campaignId: form.campaignId || null,
        customDomainId: form.customDomainId || null,
        utmSource: form.utmSource || null,
        utmMedium: form.utmMedium || null,
        utmCampaign: form.utmCampaign || null,
        activeFrom: form.activeFrom ? new Date(form.activeFrom).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        fallbackUrl: form.fallbackUrl || null,
        passwordPrompt: form.passwordPrompt || null,
        iosUrl: form.iosUrl || null,
        androidUrl: form.androidUrl || null,
        desktopUrl: form.desktopUrl || null,
        countryRules,
        notifyAtScans: form.notifyAtScans ? Number(form.notifyAtScans) : null,
        foregroundColor: form.foregroundColor,
        accentColor: form.accentColor,
        frameTitle: form.frameTitle || null,
        frameText: form.frameText || null,
        brandName: form.brandName || null,
        logoUrl: form.logoUrl || null,
      };
      if (form.removePassword) payload.password = null;
      else if (form.password) payload.password = form.password;

      const response = await fetch(`/api/qrcodes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Falha ao salvar configurações.");
      setMessage("Configurações salvas. O QR Code impresso continua válido.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="shell py-14"><div className="card p-8 muted">Carregando configurações...</div></main>;
  if (!form || !item || !plan) return <main className="shell py-14"><div className="card p-8 text-rose-200">{error || "QR Code não encontrado."}</div></main>;

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div><span className="badge">Configuração avançada</span><h1 className="text-3xl md:text-4xl font-black mt-3">{item.name}</h1><p className="text-emerald-300 text-sm mt-2 break-all">{publicLink}</p></div>
        <div className="flex gap-2"><Link className="btn-secondary" href={`/dashboard/qrcodes/${id}/print`}>Personalizar impressão</Link><Link className="btn-secondary" href="/dashboard">Voltar</Link></div>
      </div>

      {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
      {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

      <form onSubmit={save} className="space-y-5">
        <section className="card p-6 md:p-7">
          <h2 className="text-xl font-black">Destino e organização</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <label className="text-sm font-bold">Nome<input className="input mt-2" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required /></label>
            <label className="text-sm font-bold">URL principal<input className="input mt-2" type="url" value={form.originalUrl} onChange={(e)=>setForm({...form,originalUrl:e.target.value})} required /></label>
            <label className="text-sm font-bold">Campanha<select className="input mt-2" value={form.campaignId} disabled={!plan.campaigns} onChange={(e)=>setForm({...form,campaignId:e.target.value})}><option value="">Sem campanha</option>{campaigns.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{!plan.campaigns && <span className="muted text-xs block mt-2">Disponível no Pro.</span>}</label>
            <label className="text-sm font-bold">Domínio do QR<select className="input mt-2" value={form.customDomainId} disabled={!plan.customDomains} onChange={(e)=>setForm({...form,customDomainId:e.target.value})}><option value="">Domínio padrão</option>{domains.filter((d)=>d.verifiedAt).map((d)=><option key={d.id} value={d.id}>{d.host}</option>)}</select>{!plan.customDomains && <span className="muted text-xs block mt-2">Disponível no Business.</span>}</label>
          </div>
        </section>

        <section className="card p-6 md:p-7">
          <h2 className="text-xl font-black">UTM e atribuição</h2><p className="muted text-sm mt-1">Os parâmetros são adicionados automaticamente ao destino sem alterar o QR impresso.</p>
          <div className="grid md:grid-cols-3 gap-4 mt-5">
            <label className="text-sm font-bold">utm_source<input className="input mt-2" value={form.utmSource} onChange={(e)=>setForm({...form,utmSource:e.target.value})} placeholder="instagram" /></label>
            <label className="text-sm font-bold">utm_medium<input className="input mt-2" value={form.utmMedium} onChange={(e)=>setForm({...form,utmMedium:e.target.value})} placeholder="qrcode" /></label>
            <label className="text-sm font-bold">utm_campaign<input className="input mt-2" value={form.utmCampaign} onChange={(e)=>setForm({...form,utmCampaign:e.target.value})} placeholder="black_friday" /></label>
          </div>
        </section>

        <section className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Agendamento e expiração</h2><p className="muted text-sm mt-1">Defina quando a campanha começa e termina.</p></div>{!plan.scheduledLinks && <span className="badge">Pro</span>}</div>
          <fieldset disabled={!plan.scheduledLinks} className="grid md:grid-cols-2 gap-4 mt-5 disabled:opacity-50">
            <label className="text-sm font-bold">Ativar em<input className="input mt-2" type="datetime-local" value={form.activeFrom} onChange={(e)=>setForm({...form,activeFrom:e.target.value})} /></label>
            <label className="text-sm font-bold">Expirar em<input className="input mt-2" type="datetime-local" value={form.expiresAt} onChange={(e)=>setForm({...form,expiresAt:e.target.value})} /></label>
            <label className="text-sm font-bold md:col-span-2">URL alternativa após/antes da validade<input className="input mt-2" type="url" value={form.fallbackUrl} onChange={(e)=>setForm({...form,fallbackUrl:e.target.value})} placeholder="https://seusite.com/campanha-encerrada" /></label>
          </fieldset>
        </section>

        <section className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Proteção e alertas</h2><p className="muted text-sm mt-1">Proteja o destino e receba um alerta ao atingir uma meta.</p></div>{!plan.passwordProtection && <span className="badge">Pro</span>}</div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <fieldset disabled={!plan.passwordProtection} className="disabled:opacity-50 space-y-4">
              <label className="text-sm font-bold">Nova senha<input className="input mt-2" type="password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value,removePassword:false})} placeholder={item.passwordProtected ? "Deixe vazio para manter a atual" : "Opcional"} /></label>
              <label className="text-sm font-bold">Mensagem da tela de senha<input className="input mt-2" value={form.passwordPrompt} onChange={(e)=>setForm({...form,passwordPrompt:e.target.value})} placeholder="Digite a senha recebida no convite" /></label>
              {item.passwordProtected && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.removePassword} onChange={(e)=>setForm({...form,removePassword:e.target.checked,password:""})} /> Remover proteção por senha</label>}
            </fieldset>
            <label className="text-sm font-bold">Alertar quando atingir<input className="input mt-2" type="number" min="1" value={form.notifyAtScans} onChange={(e)=>setForm({...form,notifyAtScans:e.target.value})} placeholder="1000 scans" /><span className="muted text-xs block mt-2">Cria uma notificação dentro do painel quando a meta for alcançada.</span></label>
          </div>
        </section>

        <section className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Smart Redirect</h2><p className="muted text-sm mt-1">Envie cada público para a página mais adequada.</p></div>{!plan.smartRedirect && <span className="badge">Business</span>}</div>
          <fieldset disabled={!plan.smartRedirect} className="disabled:opacity-50 mt-5">
            <div className="grid md:grid-cols-3 gap-4">
              <label className="text-sm font-bold">iPhone / iPad<input className="input mt-2" type="url" value={form.iosUrl} onChange={(e)=>setForm({...form,iosUrl:e.target.value})} placeholder="https://apps.apple.com/..." /></label>
              <label className="text-sm font-bold">Android<input className="input mt-2" type="url" value={form.androidUrl} onChange={(e)=>setForm({...form,androidUrl:e.target.value})} placeholder="https://play.google.com/..." /></label>
              <label className="text-sm font-bold">Desktop<input className="input mt-2" type="url" value={form.desktopUrl} onChange={(e)=>setForm({...form,desktopUrl:e.target.value})} placeholder="https://seusite.com" /></label>
            </div>
            <label className="block text-sm font-bold mt-4">Regras por país<textarea className="input mt-2 min-h-28 font-mono text-sm" value={form.countryRules} onChange={(e)=>setForm({...form,countryRules:e.target.value})} placeholder={"BR=https://site.com/br\nUS=https://site.com/en"} /><span className="muted text-xs block mt-2">Uma regra por linha no formato PAÍS=URL. A regra de país tem prioridade sobre a regra de dispositivo.</span></label>
          </fieldset>
        </section>

        <section className="card p-6 md:p-7">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Identidade visual</h2><p className="muted text-sm mt-1">Esses valores viram o padrão da impressão personalizada.</p></div>{!plan.customBranding && <span className="badge">Pro</span>}</div>
          <fieldset disabled={!plan.customBranding} className="grid md:grid-cols-2 gap-4 mt-5 disabled:opacity-50">
            <label className="text-sm font-bold">Cor do QR<input className="input mt-2 !p-2 h-12" type="color" value={form.foregroundColor} onChange={(e)=>setForm({...form,foregroundColor:e.target.value})} /></label>
            <label className="text-sm font-bold">Cor de destaque<input className="input mt-2 !p-2 h-12" type="color" value={form.accentColor} onChange={(e)=>setForm({...form,accentColor:e.target.value})} /></label>
            <label className="text-sm font-bold">Título da peça<input className="input mt-2" value={form.frameTitle} onChange={(e)=>setForm({...form,frameTitle:e.target.value})} placeholder={item.name} /></label>
            <label className="text-sm font-bold">Marca<input className="input mt-2" value={form.brandName} onChange={(e)=>setForm({...form,brandName:e.target.value})} placeholder="Minha empresa" /></label>
            <label className="text-sm font-bold md:col-span-2">Chamada<input className="input mt-2" value={form.frameText} onChange={(e)=>setForm({...form,frameText:e.target.value})} placeholder="Aponte a câmera para saber mais" /></label>
            <label className="text-sm font-bold md:col-span-2">URL do logo (opcional)<input className="input mt-2" type="url" value={form.logoUrl} onChange={(e)=>setForm({...form,logoUrl:e.target.value})} placeholder="https://seusite.com/logo.png" /></label>
          </fieldset>
        </section>

        <div className="sticky bottom-4 z-20 flex justify-end"><button className="btn-primary shadow-2xl" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button></div>
      </form>
    </main>
  );
}

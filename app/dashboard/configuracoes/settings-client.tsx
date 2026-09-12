"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Domain = { id: string; host: string; verificationToken: string; verifiedAt: string | null; createdAt: string };
type ApiKey = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
type Webhook = { id: string; name: string; url: string; active: boolean; createdAt: string };
type Integration = { gaMeasurementId: string | null; gaApiSecretConfigured: boolean; metaPixelId: string | null; metaAccessTokenConfigured: boolean } | null;

type FeatureState<T> = { items: T[]; enabled: boolean };

export default function SettingsClient() {
  const [domains, setDomains] = useState<FeatureState<Domain>>({ items: [], enabled: false });
  const [cnameTarget, setCnameTarget] = useState("");
  const [apiKeys, setApiKeys] = useState<FeatureState<ApiKey>>({ items: [], enabled: false });
  const [webhooks, setWebhooks] = useState<FeatureState<Webhook>>({ items: [], enabled: false });
  const [integration, setIntegration] = useState<Integration>(null);
  const [integrationsEnabled, setIntegrationsEnabled] = useState(false);
  const [domainHost, setDomainHost] = useState("");
  const [apiName, setApiName] = useState("Integração principal");
  const [webhookForm, setWebhookForm] = useState({ name: "n8n", url: "" });
  const [integrationForm, setIntegrationForm] = useState({ gaMeasurementId: "", gaApiSecret: "", metaPixelId: "", metaAccessToken: "" });
  const [oneTimeSecret, setOneTimeSecret] = useState<{ title: string; value: string } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [domainRes, apiRes, webhookRes, integrationRes] = await Promise.all([
        fetch("/api/settings/domains", { cache: "no-store" }),
        fetch("/api/settings/api-keys", { cache: "no-store" }),
        fetch("/api/settings/webhooks", { cache: "no-store" }),
        fetch("/api/settings/integrations", { cache: "no-store" }),
      ]);
      if ([domainRes, apiRes, webhookRes, integrationRes].some((response) => response.status === 401)) throw new Error("Sua sessão expirou.");
      const [domainData, apiData, webhookData, integrationData] = await Promise.all([
        domainRes.json(), apiRes.json(), webhookRes.json(), integrationRes.json(),
      ]);
      setDomains({ items: domainData.items ?? [], enabled: Boolean(domainData.enabled) });
      setCnameTarget(domainData.cnameTarget ?? "");
      setApiKeys({ items: apiData.items ?? [], enabled: Boolean(apiData.enabled) });
      setWebhooks({ items: webhookData.items ?? [], enabled: Boolean(webhookData.enabled) });
      setIntegration(integrationData.integration ?? null);
      setIntegrationsEnabled(Boolean(integrationData.enabled));
      setIntegrationForm((current) => ({
        ...current,
        gaMeasurementId: integrationData.integration?.gaMeasurementId ?? "",
        metaPixelId: integrationData.integration?.metaPixelId ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createDomain(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch("/api/settings/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: domainHost }) });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Falha ao cadastrar domínio."); return; }
    setDomainHost(""); setMessage("Domínio cadastrado. Crie o TXT indicado e depois clique em verificar."); await load();
  }

  async function verifyDomain(id: string) {
    setError(""); const response = await fetch(`/api/settings/domains/${id}`, { method: "POST" }); const data = await response.json();
    if (!response.ok) setError(data.message || "DNS ainda não verificado."); else { setMessage("Domínio verificado com sucesso."); await load(); }
  }

  async function removeDomain(id: string) {
    if (!window.confirm("Remover este domínio?")) return;
    const response = await fetch(`/api/settings/domains/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  async function createApiKey(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/settings/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: apiName }) });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Falha ao gerar chave."); return; }
    setOneTimeSecret({ title: "Chave de API — copie agora", value: data.token }); await load();
  }

  async function revokeApiKey(id: string) {
    if (!window.confirm("Revogar esta chave? Integrações que a utilizam deixarão de funcionar.")) return;
    const response = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  async function createWebhook(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/settings/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookForm) });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Falha ao criar webhook."); return; }
    setOneTimeSecret({ title: "Secret do webhook — copie agora", value: data.secret });
    setWebhookForm({ name: "n8n", url: "" }); await load();
  }

  async function toggleWebhook(item: Webhook) {
    await fetch(`/api/settings/webhooks/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) });
    await load();
  }

  async function removeWebhook(id: string) {
    if (!window.confirm("Excluir este webhook?")) return;
    await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" }); await load();
  }

  async function saveIntegrations(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const payload: Record<string, string | null> = {
      gaMeasurementId: integrationForm.gaMeasurementId || null,
      metaPixelId: integrationForm.metaPixelId || null,
    };
    if (integrationForm.gaApiSecret) payload.gaApiSecret = integrationForm.gaApiSecret;
    if (integrationForm.metaAccessToken) payload.metaAccessToken = integrationForm.metaAccessToken;
    const response = await fetch("/api/settings/integrations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Falha ao salvar integrações."); return; }
    setIntegrationForm((current)=>({...current,gaApiSecret:"",metaAccessToken:""})); setMessage("Integrações salvas com segurança."); await load();
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value); setMessage("Copiado para a área de transferência.");
  }

  const locked = (enabled: boolean) => !enabled && !loading;

  return <main className="shell py-10 md:py-14">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8"><div><span className="badge">Business</span><h1 className="text-3xl md:text-4xl font-black mt-3">Integrações e infraestrutura</h1><p className="muted mt-2 max-w-2xl">Conecte domínio próprio, automações, analytics e sistemas externos sem expor credenciais no navegador.</p></div><Link className="btn-secondary" href="/dashboard">Voltar ao dashboard</Link></div>
    {error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
    {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}
    {oneTimeSecret && <div className="mb-5 card p-5 border-amber-300/40"><div className="font-black text-amber-200">{oneTimeSecret.title}</div><p className="muted text-sm mt-1">Por segurança este valor completo não será exibido novamente.</p><div className="flex gap-2 mt-4"><code className="min-w-0 flex-1 rounded-xl bg-black/30 p-3 break-all text-sm">{oneTimeSecret.value}</code><button className="btn-secondary" onClick={()=>void copy(oneTimeSecret.value)}>Copiar</button></div><button className="text-sm underline mt-3" onClick={()=>setOneTimeSecret(null)}>Já salvei</button></div>}

    <div className="space-y-5">
      <section className={`card p-6 md:p-7 ${locked(domains.enabled) ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Domínio próprio</h2><p className="muted text-sm mt-1">Use algo como qr.suaempresa.com no lugar do domínio padrão.</p></div>{locked(domains.enabled) && <span className="badge">Business</span>}</div>
        {domains.enabled && <><form className="grid md:grid-cols-[1fr_auto] gap-3 mt-5" onSubmit={createDomain}><input className="input" value={domainHost} onChange={(e)=>setDomainHost(e.target.value)} placeholder="qr.suaempresa.com" required /><button className="btn-primary">Adicionar domínio</button></form><div className="mt-5 space-y-3">{domains.items.map((domain)=><div key={domain.id} className="rounded-2xl border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-extrabold">{domain.host}</div><div className={`text-xs mt-1 ${domain.verifiedAt ? "text-emerald-300" : "text-amber-200"}`}>{domain.verifiedAt ? "DNS verificado" : "Aguardando verificação"}</div></div><div className="flex gap-2">{!domain.verifiedAt && <button className="btn-secondary !py-2 !px-3 text-sm" onClick={()=>void verifyDomain(domain.id)}>Verificar DNS</button>}<button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void removeDomain(domain.id)}>Remover</button></div></div>{!domain.verifiedAt && <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-black/20 p-3"><strong>TXT</strong><div className="mt-1 break-all">_qrmetrics.{domain.host}</div><div className="mt-1 break-all text-emerald-300">{domain.verificationToken}</div></div><div className="rounded-xl bg-black/20 p-3"><strong>CNAME</strong><div className="mt-1 break-all">{domain.host}</div><div className="mt-1 break-all text-emerald-300">{cnameTarget || "domínio principal da aplicação"}</div></div></div>}</div>)}</div><p className="muted text-xs mt-4">Além do DNS, o domínio precisa estar aceito pelo proxy da implantação. Em Coolify, adicione o domínio ao serviço da aplicação ou use uma estratégia wildcard.</p></>}
      </section>

      <section className={`card p-6 md:p-7 ${locked(apiKeys.enabled) ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">API</h2><p className="muted text-sm mt-1">Crie QR Codes via n8n, ERP ou qualquer sistema usando Bearer Token.</p></div>{locked(apiKeys.enabled) && <span className="badge">Business</span>}</div>
        {apiKeys.enabled && <><form onSubmit={createApiKey} className="grid md:grid-cols-[1fr_auto] gap-3 mt-5"><input className="input" value={apiName} onChange={(e)=>setApiName(e.target.value)} required /><button className="btn-primary">Gerar chave</button></form><div className="mt-5 space-y-2">{apiKeys.items.map((key)=><div key={key.id} className="rounded-xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold">{key.name}</div><div className="muted text-xs mt-1">qrp_{key.prefix}_•••••• • {key.revokedAt ? "revogada" : key.lastUsedAt ? `usada em ${new Date(key.lastUsedAt).toLocaleString("pt-BR")}` : "nunca usada"}</div></div>{!key.revokedAt && <button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void revokeApiKey(key.id)}>Revogar</button>}</div>)}</div><div className="mt-4 rounded-xl bg-black/20 p-4 text-sm"><div className="font-bold">Endpoint</div><code className="text-emerald-300 break-all">POST /api/v1/qrcodes</code><div className="muted text-xs mt-2">Authorization: Bearer SUA_CHAVE</div></div></>}
      </section>

      <section className={`card p-6 md:p-7 ${locked(webhooks.enabled) ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Webhooks</h2><p className="muted text-sm mt-1">Receba um evento <code>scan.created</code> a cada leitura do QR.</p></div>{locked(webhooks.enabled) && <span className="badge">Business</span>}</div>
        {webhooks.enabled && <><form onSubmit={createWebhook} className="grid lg:grid-cols-[.6fr_1.4fr_auto] gap-3 mt-5"><input className="input" value={webhookForm.name} onChange={(e)=>setWebhookForm({...webhookForm,name:e.target.value})} placeholder="n8n" required /><input className="input" type="url" value={webhookForm.url} onChange={(e)=>setWebhookForm({...webhookForm,url:e.target.value})} placeholder="https://n8n.seudominio.com/webhook/..." required /><button className="btn-primary">Adicionar</button></form><div className="mt-5 space-y-2">{webhooks.items.map((hook)=><div key={hook.id} className="rounded-xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><div className="font-bold">{hook.name} <span className={hook.active ? "text-emerald-300" : "muted"}>• {hook.active ? "ativo" : "pausado"}</span></div><div className="muted text-xs mt-1 truncate">{hook.url}</div></div><div className="flex gap-2"><button className="btn-secondary !py-2 !px-3 text-sm" onClick={()=>void toggleWebhook(hook)}>{hook.active ? "Pausar" : "Ativar"}</button><button className="btn-secondary !py-2 !px-3 text-sm !text-rose-300" onClick={()=>void removeWebhook(hook.id)}>Excluir</button></div></div>)}</div><p className="muted text-xs mt-4">Assinatura HMAC SHA-256 enviada em <code>X-QR-Signature</code>.</p></>}
      </section>

      <section className={`card p-6 md:p-7 ${locked(integrationsEnabled) ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">GA4 e Meta</h2><p className="muted text-sm mt-1">Envie cada scan como evento server-side para suas ferramentas de mensuração.</p></div>{locked(integrationsEnabled) && <span className="badge">Business</span>}</div>
        {integrationsEnabled && <form onSubmit={saveIntegrations} className="mt-5"><div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-bold">GA4 Measurement ID<input className="input mt-2" value={integrationForm.gaMeasurementId} onChange={(e)=>setIntegrationForm({...integrationForm,gaMeasurementId:e.target.value})} placeholder="G-XXXXXXXXXX" /></label><label className="text-sm font-bold">GA4 API Secret<input className="input mt-2" type="password" value={integrationForm.gaApiSecret} onChange={(e)=>setIntegrationForm({...integrationForm,gaApiSecret:e.target.value})} placeholder={integration?.gaApiSecretConfigured ? "Configurado — deixe vazio para manter" : "Measurement Protocol secret"} /></label><label className="text-sm font-bold">Meta Pixel ID<input className="input mt-2" value={integrationForm.metaPixelId} onChange={(e)=>setIntegrationForm({...integrationForm,metaPixelId:e.target.value})} placeholder="1234567890" /></label><label className="text-sm font-bold">Meta Access Token<input className="input mt-2" type="password" value={integrationForm.metaAccessToken} onChange={(e)=>setIntegrationForm({...integrationForm,metaAccessToken:e.target.value})} placeholder={integration?.metaAccessTokenConfigured ? "Configurado — deixe vazio para manter" : "Conversions API token"} /></label></div><button className="btn-primary mt-5">Salvar integrações</button></form>}
      </section>
    </div>
  </main>;
}

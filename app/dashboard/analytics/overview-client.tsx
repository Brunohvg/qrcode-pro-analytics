"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CountItem = { label: string; count: number };
type Campaign = { id: string; name: string; color: string } | null;
type TopQr = {
  id: string;
  name: string;
  slug: string;
  campaign: Campaign;
  periodScans: number;
  lifetimeScans: number;
  createdAt: string;
};
type RecentScan = {
  id: string;
  device: string;
  country: string;
  browser: string;
  scannedAt: string;
  qrCode: {
    id: string;
    name: string;
    campaign: { name: string; color: string } | null;
  };
};
type AnalyticsOverview = {
  success: true;
  plan: {
    name: string;
    analyticsDays: number;
    availablePeriods: number[];
    canViewAll: boolean;
  };
  period: {
    days: number | null;
    label: string;
    from: string | null;
    to: string;
  };
  summary: {
    periodScans: number;
    previousPeriodScans: number;
    growthPercent: number | null;
    lifetimeScans: number;
    qrCount: number;
    activeQrCount: number;
    averageScansPerQr: number;
  };
  byDay: CountItem[];
  byDevice: CountItem[];
  byBrowser: CountItem[];
  byCountry: CountItem[];
  byCampaign: CountItem[];
  topQrs: TopQr[];
  recent: RecentScan[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DistributionCard({ title, items, emptyText }: { title: string; items: CountItem[]; emptyText: string }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="card p-5 md:p-6">
      <h2 className="font-black text-lg">{title}</h2>
      {items.length === 0 ? (
        <p className="muted text-sm mt-4">{emptyText}</p>
      ) : (
        <div className="space-y-4 mt-5">
          {items.map((item) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate" title={item.label}>{item.label}</span>
                  <span className="muted shrink-0">{formatNumber(item.count)} · {percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AnalyticsOverviewClient() {
  const router = useRouter();
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/overview?days=${encodeURIComponent(period)}`, { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível carregar o Analytics Geral.");
      setData(payload as AnalyticsOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar analytics.");
    } finally {
      setLoading(false);
    }
  }, [period, router]);

  useEffect(() => { void load(); }, [load]);

  const chartMax = useMemo(() => Math.max(...(data?.byDay.map((item) => item.count) ?? [1]), 1), [data]);
  const selectValue = data?.period.days === null ? "all" : String(data?.period.days ?? period);
  const growth = data?.summary.growthPercent ?? null;

  return (
    <main className="shell py-10 md:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Analytics Geral</span>
            {data && <span className="muted text-xs">Plano {data.plan.name}</span>}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mt-3">Visão completa da operação</h1>
          <p className="muted mt-2 max-w-2xl">Acompanhe todos os QR Codes e campanhas em um único painel, sem precisar abrir cada código individualmente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input !w-auto min-w-40"
            value={selectValue}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Período do analytics"
          >
            {(data?.plan.availablePeriods ?? [7, 30]).map((days) => <option key={days} value={days}>Últimos {days} dias</option>)}
            {data?.plan.canViewAll && <option value="all">Todo o histórico</option>}
          </select>
          <Link href="/dashboard" className="btn-secondary">Voltar ao dashboard</Link>
        </div>
      </div>

      {error && <div className="mb-6 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}

      {loading && !data ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="card h-32 animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="card p-5">
              <div className="muted text-sm font-bold">Scans no período</div>
              <div className="text-3xl font-black mt-2">{formatNumber(data.summary.periodScans)}</div>
              <div className="text-xs mt-2">
                {growth === null
                  ? <span className="muted">Sem base anterior para comparação</span>
                  : <span className={growth >= 0 ? "text-emerald-300" : "text-rose-300"}>{growth >= 0 ? "+" : ""}{growth}% vs. período anterior</span>}
              </div>
            </div>
            <div className="card p-5">
              <div className="muted text-sm font-bold">Scans históricos</div>
              <div className="text-3xl font-black mt-2">{formatNumber(data.summary.lifetimeScans)}</div>
              <div className="muted text-xs mt-2">Desde a criação da conta</div>
            </div>
            <div className="card p-5">
              <div className="muted text-sm font-bold">QR Codes ativos</div>
              <div className="text-3xl font-black mt-2">{formatNumber(data.summary.activeQrCount)}</div>
              <div className="muted text-xs mt-2">de {formatNumber(data.summary.qrCount)} com scans no período</div>
            </div>
            <div className="card p-5">
              <div className="muted text-sm font-bold">Média por QR</div>
              <div className="text-3xl font-black mt-2">{formatNumber(data.summary.averageScansPerQr)}</div>
              <div className="muted text-xs mt-2">scans por código no período</div>
            </div>
          </section>

          <section className="card p-5 md:p-7 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-black text-xl">Evolução de scans</h2>
                <p className="muted text-sm mt-1">{data.period.label}</p>
              </div>
              <div className="muted text-sm">Período anterior: {formatNumber(data.summary.previousPeriodScans)} scans</div>
            </div>
            {data.byDay.length === 0 ? (
              <div className="muted py-12 text-center">Ainda não há scans neste período.</div>
            ) : (
              <div className="mt-7 overflow-x-auto">
                <div className="h-64 min-w-[720px] flex items-end gap-1.5 border-b border-white/10 pb-7 relative">
                  {data.byDay.map((item, index) => {
                    const height = item.count === 0 ? 2 : Math.max(5, (item.count / chartMax) * 100);
                    const showLabel = data.byDay.length <= 31 || index % Math.ceil(data.byDay.length / 16) === 0 || index === data.byDay.length - 1;
                    return (
                      <div key={item.label} className="flex-1 h-full flex items-end relative group" title={`${item.label}: ${item.count} scans`}>
                        <div className="w-full rounded-t bg-emerald-300/80 group-hover:bg-emerald-300 transition" style={{ height: `${height}%` }} />
                        {showLabel && <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] muted whitespace-nowrap">{item.label.slice(5).split("-").reverse().join("/")}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-black text-lg">QR Codes com melhor desempenho</h2>
                  <p className="muted text-sm mt-1">Ranking pelo período selecionado.</p>
                </div>
              </div>
              <div className="overflow-x-auto mt-5">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="muted text-left border-b border-white/10">
                    <tr><th className="pb-3 font-bold">QR Code</th><th className="pb-3 font-bold text-right">Período</th><th className="pb-3 font-bold text-right">Histórico</th><th className="pb-3" /></tr>
                  </thead>
                  <tbody>
                    {data.topQrs.map((qr, index) => (
                      <tr key={qr.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-3">
                          <div className="font-bold"><span className="muted mr-2">#{index + 1}</span>{qr.name}</div>
                          {qr.campaign && <div className="muted text-xs mt-1">{qr.campaign.name}</div>}
                        </td>
                        <td className="py-3 text-right font-black">{formatNumber(qr.periodScans)}</td>
                        <td className="py-3 text-right muted">{formatNumber(qr.lifetimeScans)}</td>
                        <td className="py-3 pl-3 text-right"><Link href={`/dashboard/analytics/${qr.id}`} className="text-emerald-300 font-bold">Detalhes</Link></td>
                      </tr>
                    ))}
                    {data.topQrs.length === 0 && <tr><td colSpan={4} className="py-8 text-center muted">Nenhum QR Code criado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <DistributionCard title="Campanhas" items={data.byCampaign} emptyText="Nenhuma campanha com scans no período." />
          </section>

          <section className="grid md:grid-cols-3 gap-6 mb-6">
            <DistributionCard title="Dispositivos" items={data.byDevice} emptyText="Sem dados de dispositivo." />
            <DistributionCard title="Navegadores" items={data.byBrowser} emptyText="Sem dados de navegador." />
            <DistributionCard title="Países" items={data.byCountry} emptyText="Sem dados de país." />
          </section>

          <section className="card p-5 md:p-7">
            <div>
              <h2 className="font-black text-xl">Atividade recente</h2>
              <p className="muted text-sm mt-1">Últimos scans registrados no período selecionado.</p>
            </div>
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="muted text-left border-b border-white/10">
                  <tr><th className="pb-3">Data</th><th className="pb-3">QR Code</th><th className="pb-3">Campanha</th><th className="pb-3">Dispositivo</th><th className="pb-3">Navegador</th><th className="pb-3">País</th></tr>
                </thead>
                <tbody>
                  {data.recent.map((scan) => (
                    <tr key={scan.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 pr-3 muted whitespace-nowrap">{formatDate(scan.scannedAt)}</td>
                      <td className="py-3 pr-3 font-bold">{scan.qrCode.name}</td>
                      <td className="py-3 pr-3 muted">{scan.qrCode.campaign?.name ?? "—"}</td>
                      <td className="py-3 pr-3">{scan.device}</td>
                      <td className="py-3 pr-3">{scan.browser}</td>
                      <td className="py-3">{scan.country}</td>
                    </tr>
                  ))}
                  {data.recent.length === 0 && <tr><td colSpan={6} className="py-8 text-center muted">Nenhum scan registrado neste período.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

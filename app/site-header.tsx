"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SessionState = {
  authenticated: boolean;
  admin: boolean;
  email?: string;
};

const navigation = [
  ["Dashboard", "/dashboard"],
  ["Analytics", "/dashboard/analytics"],
  ["WhatsApp", "/ferramentas/whatsapp"],
  ["Assinatura", "/billing"],
  ["Planos", "/planos"],
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false, admin: false });

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: SessionState) => {
        if (active) setSession(payload);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="font-black tracking-tight text-base sm:text-lg whitespace-nowrap">
          QR Metrics <span className="text-emerald-300">Pro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Navegação principal">
          <Link className="hidden lg:inline-flex btn-secondary !py-2 !px-3" href="/ferramentas/whatsapp">WhatsApp</Link>
          <Link className="btn-secondary !py-2 !px-3" href="/dashboard/analytics">Analytics</Link>
          <Link className="hidden lg:inline-flex btn-secondary !py-2 !px-3" href="/billing">Assinatura</Link>
          <Link className="btn-secondary !py-2 !px-3" href="/planos">Planos</Link>
          {session.admin && <Link className="btn-secondary !py-2 !px-3 border-amber-300/30 text-amber-200" href="/admin/billing">Admin</Link>}
          <Link className="btn-primary !py-2 !px-3" href="/dashboard">Dashboard</Link>
        </nav>

        <button
          type="button"
          className="md:hidden inline-flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <span className="grid gap-1.5" aria-hidden="true">
            <span className={`block h-0.5 w-5 bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-[#07111f]/98 backdrop-blur-xl border-t border-white/10 overflow-y-auto">
          <div className="shell py-5">
            {session.authenticated && session.email && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                <div className="text-xs uppercase tracking-wider muted">Conta</div>
                <div className="font-bold mt-1 break-all">{session.email}</div>
                {session.admin && <div className="badge mt-2 border-amber-300/30 !text-amber-200">Administrador do SaaS</div>}
              </div>
            )}

            <nav className="grid gap-2" aria-label="Menu mobile">
              {navigation.map(([label, href]) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`min-h-12 rounded-xl border px-4 py-3 font-bold flex items-center justify-between ${active ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200" : "border-white/10 bg-white/[0.03]"}`}
                  >
                    <span>{label}</span><span aria-hidden="true">›</span>
                  </Link>
                );
              })}

              {session.admin && (
                <Link href="/admin/billing" className="min-h-12 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 font-black text-amber-100 flex items-center justify-between">
                  <span>Admin do SaaS</span><span aria-hidden="true">›</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Metrics Pro — QR Codes dinâmicos com analytics",
  description: "Crie QR Codes dinâmicos, altere destinos sem reimprimir, acompanhe scans e conecte campanhas ao WhatsApp, GA4, Meta e automações.",
};

const secondaryLinks = [
  ["WhatsApp", "/ferramentas/whatsapp"],
  ["Analytics", "/dashboard/analytics"],
  ["Assinatura", "/billing"],
  ["Planos", "/planos"],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl sticky top-0 z-40">
          <div className="shell flex h-16 items-center justify-between gap-3">
            <Link href="/" className="font-black tracking-tight text-base sm:text-lg whitespace-nowrap">
              QR Metrics <span className="text-emerald-300">Pro</span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-sm">
              <Link className="hidden lg:inline-flex btn-secondary !py-2 !px-3" href="/ferramentas/whatsapp">WhatsApp</Link>
              <Link className="btn-secondary !py-2 !px-3" href="/dashboard/analytics">Analytics</Link>
              <Link className="hidden lg:inline-flex btn-secondary !py-2 !px-3" href="/billing">Assinatura</Link>
              <Link className="btn-secondary !py-2 !px-3" href="/planos">Planos</Link>
              <Link className="btn-primary !py-2 !px-3" href="/dashboard">Dashboard</Link>
            </nav>

            <Link className="md:hidden btn-primary !py-2 !px-3 text-sm" href="/dashboard">Dashboard</Link>
          </div>

          <div className="md:hidden border-t border-white/8">
            <nav className="mobile-scroll-nav shell flex items-center gap-2 py-2 text-sm" aria-label="Navegação principal">
              {secondaryLinks.map(([label, href]) => (
                <Link key={href} className="btn-secondary !min-h-9 !py-1.5 !px-3" href={href}>{label}</Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

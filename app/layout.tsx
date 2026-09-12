import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Metrics Pro — QR Codes dinâmicos com analytics",
  description: "Crie QR Codes dinâmicos, altere destinos sem reimprimir, acompanhe scans e conecte campanhas ao WhatsApp, GA4, Meta e automações.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="shell flex h-16 items-center justify-between gap-4">
            <Link href="/" className="font-black tracking-tight text-lg">QR Metrics <span className="text-emerald-300">Pro</span></Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link className="hidden sm:inline-flex btn-secondary !py-2 !px-3" href="/ferramentas/whatsapp">WhatsApp</Link>
              <Link className="btn-secondary !py-2 !px-3" href="/planos">Planos</Link>
              <Link className="btn-primary !py-2 !px-3" href="/dashboard">Dashboard</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

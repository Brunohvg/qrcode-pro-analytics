import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./site-header";

export const metadata: Metadata = {
  title: "QR Metrics Pro — QR Codes dinâmicos com analytics",
  description: "Crie QR Codes dinâmicos, altere destinos sem reimprimir, acompanhe scans e conecte campanhas ao WhatsApp, GA4, Meta e automações.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

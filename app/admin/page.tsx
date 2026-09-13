import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDeveloperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireDeveloperAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <main className="shell py-10 md:py-14">
      <div className="max-w-3xl">
        <span className="badge">Administrador do SaaS</span>
        <h1 className="text-3xl md:text-4xl font-black mt-3">Painel do desenvolvedor</h1>
        <p className="muted mt-3 leading-relaxed">Área privada para administrar cobrança, clientes, planos e acompanhar a operação da plataforma.</p>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <Link href="/admin/billing" className="card p-6 hover:border-emerald-300/30 transition">
          <div className="text-2xl">$</div>
          <h2 className="font-black text-xl mt-4">Cobrança e clientes</h2>
          <p className="muted text-sm mt-2 leading-relaxed">MRR, clientes, pagamentos, PIX, carência e liberações administrativas.</p>
        </Link>
        <Link href="/dashboard/analytics" className="card p-6 hover:border-emerald-300/30 transition">
          <div className="text-2xl">↗</div>
          <h2 className="font-black text-xl mt-4">Analytics geral</h2>
          <p className="muted text-sm mt-2 leading-relaxed">Acompanhe scans e desempenho consolidado da operação.</p>
        </Link>
        <Link href="/dashboard" className="card p-6 hover:border-emerald-300/30 transition">
          <div className="text-2xl">⌘</div>
          <h2 className="font-black text-xl mt-4">Dashboard do produto</h2>
          <p className="muted text-sm mt-2 leading-relaxed">Acesse a experiência normal do cliente para testes e suporte.</p>
        </Link>
      </section>
    </main>
  );
}

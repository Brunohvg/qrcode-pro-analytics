import Link from "next/link";

const features = [
  ["QR dinâmico", "Altere o destino sem reimprimir o QR Code."],
  ["Métricas reais", "Acompanhe scans, dispositivo, navegador e país."],
  ["Deploy simples", "Docker preparado para Coolify + PostgreSQL."],
];

export default function HomePage() {
  return (
    <main>
      <section className="shell py-20 md:py-28 grid md:grid-cols-[1.2fr_.8fr] gap-10 items-center">
        <div>
          <span className="badge mb-5">QR Code + Analytics</span>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.03] tracking-tight max-w-3xl">
            QR Codes que você consegue <span className="text-emerald-300">medir e atualizar.</span>
          </h1>
          <p className="muted mt-6 text-lg max-w-2xl leading-relaxed">
            Crie QR Codes dinâmicos, acompanhe acessos em tempo real e centralize tudo em um painel pronto para produção.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/register" className="btn-primary">Criar conta grátis</Link>
            <Link href="/login" className="btn-secondary">Já tenho conta</Link>
          </div>
        </div>
        <div className="card p-6 md:p-8">
          <div className="grid grid-cols-2 gap-4">
            {[["12.840","Scans"],["64%","Mobile"],["28","QR Codes"],["19","Países"]].map(([value,label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/10 p-5">
                <div className="text-2xl md:text-3xl font-black">{value}</div>
                <div className="muted text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 h-28 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,167,.17),transparent)] p-4 flex items-end gap-2">
            {[30,46,38,66,52,82,70,94,76,88,98,84].map((h,i)=><div key={i} className="flex-1 rounded-t bg-emerald-300/80" style={{height:`${h}%`}} />)}
          </div>
        </div>
      </section>
      <section className="shell pb-20 grid md:grid-cols-3 gap-4">
        {features.map(([title,text]) => <div key={title} className="card p-6"><h2 className="font-extrabold text-lg">{title}</h2><p className="muted mt-2 leading-relaxed">{text}</p></div>)}
      </section>
    </main>
  );
}

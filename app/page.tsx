import Link from "next/link";

const features = [
  ["QR dinâmico", "Troque a página de destino quando quiser sem reimprimir cartazes, etiquetas ou embalagens."],
  ["Analytics acionável", "Entenda volume de scans, dispositivo, navegador, país e evolução de cada QR ou campanha."],
  ["Campanhas + UTM", "Organize ações e aplique UTM automaticamente para levar a atribuição até suas ferramentas de marketing."],
  ["Smart Redirect", "Direcione iPhone, Android, desktop ou países diferentes para experiências específicas."],
  ["Branding e impressão", "Crie peças de QR mais profissionais com cores, títulos, marca e layout pronto para impressão."],
  ["Integrações", "Conecte GA4, Meta, webhooks, API e domínio próprio nos planos voltados para operação."],
] as const;

const useCases = [
  ["Varejo", "Etiquetas, vitrines, catálogos, ofertas e pós-venda."],
  ["Eventos", "Convites, credenciamento, menus, programação e conteúdos protegidos."],
  ["Marketing", "Mídia impressa, influenciadores, campanhas locais e atribuição com UTM."],
  ["Atendimento", "Links de WhatsApp com mensagem pronta e QR rastreável."],
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="shell py-16 md:py-24 grid lg:grid-cols-[1.08fr_.92fr] gap-10 items-center">
        <div>
          <span className="badge mb-5">QR dinâmico • analytics • automação</span>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.03] tracking-tight max-w-4xl">
            Transforme cada QR Code em um <span className="text-emerald-300">canal mensurável de negócio.</span>
          </h1>
          <p className="muted mt-6 text-lg md:text-xl max-w-2xl leading-relaxed">
            Crie QR Codes que podem mudar de destino depois de impressos, acompanhe cada leitura e conecte suas campanhas ao WhatsApp, GA4, Meta e automações.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/register" className="btn-primary">Criar conta grátis</Link>
            <Link href="/ferramentas/whatsapp" className="btn-secondary">Gerar link de WhatsApp</Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm muted">
            <span>✓ 3 QRs grátis</span><span>✓ Sem cartão</span><span>✓ Link atualizável</span><span>✓ Analytics incluído</span>
          </div>
        </div>

        <div className="card p-5 md:p-7 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-5"><div><div className="font-black">Campanha • Loja Centro</div><div className="muted text-xs mt-1">Visão de analytics</div></div><span className="badge">Ao vivo</span></div>
          <div className="grid grid-cols-2 gap-3">
            {[["12.840","Scans"],["72%","Mobile"],["18","QR Codes"],["24","Países"]].map(([value,label]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="text-2xl md:text-3xl font-black">{value}</div><div className="muted text-sm mt-1">{label}</div></div>)}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between text-xs muted"><span>Scans nos últimos dias</span><span className="text-emerald-300 font-bold">+18,4%</span></div>
            <div className="mt-4 h-28 flex items-end gap-2">{[30,46,38,66,52,82,70,94,76,88,98,84].map((height,index)=><div key={index} className="flex-1 rounded-t bg-emerald-300/80" style={{height:`${height}%`}} />)}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs"><div className="rounded-xl border border-white/10 p-3"><strong className="block text-base">58%</strong><span className="muted">Android</span></div><div className="rounded-xl border border-white/10 p-3"><strong className="block text-base">32%</strong><span className="muted">iOS</span></div><div className="rounded-xl border border-white/10 p-3"><strong className="block text-base">10%</strong><span className="muted">Desktop</span></div></div>
        </div>
      </section>

      <section className="shell py-16 border-t border-white/8">
        <div className="max-w-3xl"><span className="badge">Mais que um gerador</span><h2 className="text-3xl md:text-4xl font-black mt-4">Você imprime uma vez. O link continua evoluindo.</h2><p className="muted mt-4 text-lg">O QR aponta primeiro para uma rota dinâmica da plataforma. É isso que permite medir, alterar o destino, aplicar regras e manter o mesmo material físico em circulação.</p></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-9">{features.map(([title,text]) => <article key={title} className="card p-6"><div className="size-10 rounded-xl bg-emerald-300/10 border border-emerald-300/20 grid place-items-center text-emerald-300 font-black">✓</div><h3 className="font-black text-lg mt-4">{title}</h3><p className="muted mt-2 leading-relaxed">{text}</p></article>)}</div>
      </section>

      <section className="shell py-16">
        <div className="card p-7 md:p-10 grid lg:grid-cols-[.8fr_1.2fr] gap-8 items-center">
          <div><span className="badge">Fluxo simples</span><h2 className="text-3xl md:text-4xl font-black mt-4">Do link ao resultado em poucos passos.</h2><p className="muted mt-4 leading-relaxed">Crie, publique e otimize sem precisar gerar um QR novo toda vez que sua campanha muda.</p><Link href="/register" className="btn-primary inline-flex mt-6">Começar agora</Link></div>
          <div className="grid sm:grid-cols-2 gap-4">{[["01","Crie","Cole uma URL ou gere seu link de WhatsApp."],["02","Personalize","Aplique marca, cores, validade, senha e UTM."],["03","Publique","Baixe o QR puro ou uma peça pronta para impressão."],["04","Otimize","Veja analytics e mude o destino sem reimprimir."]].map(([number,title,text])=><div key={number} className="rounded-2xl border border-white/10 p-5"><div className="text-emerald-300 font-black text-sm">{number}</div><h3 className="font-black mt-2">{title}</h3><p className="muted text-sm mt-2 leading-relaxed">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="shell py-16">
        <div className="text-center max-w-3xl mx-auto"><span className="badge">Feito para uso real</span><h2 className="text-3xl md:text-4xl font-black mt-4">Um QR para cada ponto de contato.</h2></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-9">{useCases.map(([title,text])=><div className="card p-6" key={title}><h3 className="font-black text-lg">{title}</h3><p className="muted mt-2 text-sm leading-relaxed">{text}</p></div>)}</div>
      </section>

      <section className="shell py-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="badge">Planos que acompanham seu crescimento</span><h2 className="text-3xl md:text-4xl font-black mt-4">Comece grátis. Profissionalize quando precisar.</h2></div><Link href="/planos" className="btn-secondary">Comparar todos os planos</Link></div>
        <div className="grid md:grid-cols-2 gap-5 mt-8 max-w-4xl">
          <article className="card p-7 ring-2 ring-emerald-300/60"><span className="badge">Pro</span><div className="mt-4"><span className="text-4xl font-black">R$ 49,90</span><span className="muted">/mês</span></div><p className="muted mt-3">Campanhas, UTM, senha, agendamento, branding e relatórios para quem usa QR profissionalmente.</p><Link className="btn-primary inline-flex mt-6" href="/planos">Conhecer o Pro</Link></article>
          <article className="card p-7"><span className="badge">Business</span><div className="mt-4"><span className="text-4xl font-black">R$ 119,90</span><span className="muted">/mês</span></div><p className="muted mt-3">Smart Redirect, lote, domínio próprio, GA4, Meta, API e webhooks para operações em escala.</p><Link className="btn-secondary inline-flex mt-6" href="/planos">Conhecer o Business</Link></article>
        </div>
      </section>

      <section className="shell py-16 md:py-24"><div className="card p-8 md:p-12 text-center bg-[radial-gradient(circle_at_top,rgba(52,211,153,.16),transparent_55%)]"><h2 className="text-3xl md:text-5xl font-black max-w-3xl mx-auto">Seu próximo QR pode fazer muito mais do que abrir um link.</h2><p className="muted text-lg mt-4 max-w-2xl mx-auto">Crie gratuitamente, acompanhe os primeiros scans e descubra quais pontos de contato realmente geram resultado.</p><div className="flex flex-wrap justify-center gap-3 mt-7"><Link href="/register" className="btn-primary">Criar conta grátis</Link><Link href="/ferramentas/whatsapp" className="btn-secondary">Experimentar gerador de WhatsApp</Link></div></div></section>
    </main>
  );
}

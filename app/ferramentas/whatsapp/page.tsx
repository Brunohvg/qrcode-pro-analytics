"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function buildWhatsAppLink(countryCode: string, phone: string, message: string): string {
  const country = onlyDigits(countryCode);
  const number = onlyDigits(phone);
  if (!country || number.length < 8) return "";
  const base = `https://wa.me/${country}${number}`;
  return message.trim() ? `${base}?text=${encodeURIComponent(message.trim())}` : base;
}

export default function WhatsAppLinkGeneratorPage() {
  const [countryCode, setCountryCode] = useState("55");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const link = useMemo(
    () => buildWhatsAppLink(countryCode, phone, message),
    [countryCode, phone, message],
  );

  const qrHref = link
    ? `/dashboard?url=${encodeURIComponent(link)}&name=${encodeURIComponent(`WhatsApp ${onlyDigits(phone)}`)}`
    : "/dashboard";

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="shell py-12 md:py-20">
      <section className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_.9fr] gap-6 items-start">
        <div>
          <span className="badge">Ferramenta grátis</span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-4">
            Gerador de link para WhatsApp
          </h1>
          <p className="muted mt-4 text-lg leading-relaxed max-w-2xl">
            Monte um link direto para conversa no WhatsApp com telefone e mensagem pré-preenchida. Depois copie, teste ou transforme em QR Code dinâmico.
          </p>

          <div className="card p-6 md:p-7 mt-8">
            <div className="grid sm:grid-cols-[120px_1fr] gap-3">
              <label className="text-sm font-bold">
                País
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 muted">+</span>
                  <input
                    className="input !pl-8"
                    inputMode="numeric"
                    value={countryCode}
                    onChange={(event) => setCountryCode(onlyDigits(event.target.value).slice(0, 4))}
                    aria-label="Código do país"
                  />
                </div>
              </label>
              <label className="text-sm font-bold">
                DDD + telefone
                <input
                  className="input mt-2"
                  inputMode="tel"
                  placeholder="31999999999"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm font-bold mt-4">
              Mensagem inicial <span className="muted font-normal">(opcional)</span>
              <textarea
                className="input mt-2 min-h-32 resize-y"
                placeholder="Olá! Vim pelo QR Code e gostaria de mais informações."
                value={message}
                maxLength={1000}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-bold uppercase tracking-wider muted">Seu link</div>
              <div className="mt-2 text-sm break-all text-emerald-300 min-h-10">
                {link || "Preencha um telefone válido para gerar o link."}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button type="button" className="btn-primary" disabled={!link} onClick={() => void copyLink()}>
                {copied ? "Link copiado" : "Copiar link"}
              </button>
              {link ? (
                <a className="btn-secondary" href={link} target="_blank" rel="noreferrer">
                  Testar no WhatsApp
                </a>
              ) : (
                <button className="btn-secondary" disabled>Testar no WhatsApp</button>
              )}
              <Link className="btn-secondary" href={qrHref} aria-disabled={!link}>
                Criar QR dinâmico
              </Link>
            </div>
          </div>
        </div>

        <aside className="card p-6 md:p-7 lg:sticky lg:top-24">
          <div className="text-sm font-extrabold text-emerald-300">WhatsApp + QR dinâmico</div>
          <h2 className="text-2xl font-black mt-2">Um fluxo pronto para campanhas</h2>
          <div className="mt-6 space-y-4">
            {[
              ["1", "Gere o link", "Informe telefone e uma mensagem que já aparece para o cliente."],
              ["2", "Transforme em QR", "Leve o link direto para o criador de QR dinâmico."],
              ["3", "Meça os scans", "Acompanhe dispositivos, navegadores, países e evolução dos acessos."],
              ["4", "Troque o destino", "Mude o número ou a mensagem depois sem reimprimir o material."],
            ].map(([step, title, text]) => (
              <div key={step} className="flex gap-3">
                <div className="size-9 shrink-0 rounded-xl bg-emerald-300 text-[#07111f] grid place-items-center font-black">{step}</div>
                <div><div className="font-extrabold">{title}</div><p className="muted text-sm mt-1 leading-relaxed">{text}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

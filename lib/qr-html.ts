function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const styles = `
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07111f;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .card{width:min(100%,440px);border:1px solid rgba(255,255,255,.12);background:#0b1728;border-radius:24px;padding:30px;box-shadow:0 24px 80px rgba(0,0,0,.28)}
  .brand{font-weight:900;letter-spacing:-.02em}.brand span{color:#6ee7b7}.badge{display:inline-block;margin-top:18px;padding:6px 10px;border-radius:999px;background:rgba(110,231,183,.12);color:#6ee7b7;font-size:12px;font-weight:800}
  h1{font-size:28px;line-height:1.1;margin:14px 0 10px;letter-spacing:-.03em}p{color:#9fb0c5;line-height:1.6;margin:0}.input{width:100%;margin-top:20px;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:#07111f;color:#fff;font-size:16px;outline:none}.input:focus{border-color:#6ee7b7}.button{width:100%;margin-top:12px;border:0;border-radius:14px;padding:14px 16px;background:#6ee7b7;color:#07111f;font-size:15px;font-weight:900;cursor:pointer}.error{margin-top:12px;color:#fda4af;font-size:14px}.small{margin-top:18px;font-size:12px;color:#70839c}
`;

export function qrPasswordPage(input: { slug: string; name: string; prompt?: string | null; error?: string }): string {
  const action = `/r/${encodeURIComponent(input.slug)}/unlock`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Conteúdo protegido</title><style>${styles}</style></head><body><main class="card"><div class="brand">QR Metrics <span>Pro</span></div><span class="badge">Conteúdo protegido</span><h1>${escapeHtml(input.name)}</h1><p>${escapeHtml(input.prompt || "Digite a senha para continuar para o conteúdo deste QR Code.")}</p>${input.error ? `<div class="error">${escapeHtml(input.error)}</div>` : ""}<form method="post" action="${action}"><input class="input" type="password" name="password" autocomplete="current-password" required maxlength="128" placeholder="Senha"><button class="button" type="submit">Continuar</button></form><div class="small">A senha é validada com segurança e não é adicionada ao endereço.</div></main></body></html>`;
}

export function qrStatusPage(input: { title: string; message: string; status: string }): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(input.title)}</title><style>${styles}</style></head><body><main class="card"><div class="brand">QR Metrics <span>Pro</span></div><span class="badge">${escapeHtml(input.status)}</span><h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.message)}</p></main></body></html>`;
}

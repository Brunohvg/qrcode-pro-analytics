# QR Metrics Pro

Gerador de QR Codes dinâmicos com autenticação, planos de uso e analytics, construído com Next.js, TypeScript, Tailwind CSS, Prisma ORM e PostgreSQL. O projeto foi preparado para deploy via Docker/Coolify.

## Recursos

- Cadastro, login e logout com JWT em cookie HttpOnly.
- Hash de senha com bcrypt.
- Limite de criação conforme o plano.
- Planos Gratuito, Pro e Enterprise.
- Checkout simulado para troca de plano (não realiza cobrança real).
- QR Code dinâmico apontando para `/r/[slug]`.
- Troca do link de destino sem alterar o QR impresso.
- Contagem de scans.
- Métricas por iOS, Android e Desktop.
- Navegador e país quando o proxy/CDN fornece o cabeçalho de país (ex.: Cloudflare `CF-IPCountry`).
- Analytics de 24 horas e 30 dias para Pro/Enterprise.
- Download do QR em SVG.
- Healthcheck em `/api/health`.
- Migration automática ao iniciar o container.
- Docker multi-stage pronto para Coolify.

## Stack

- Next.js 16.3.4 (App Router)
- React 19.3
- TypeScript
- Tailwind CSS 4
- Prisma ORM 7.10
- PostgreSQL
- jose (JWT)
- bcryptjs
- qrcode
- Zod

## Ambiente local

Crie o `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Configure:

```env
DATABASE_URL=postgresql://qrcode:qrcode@localhost:5432/qrcode?schema=public
AUTH_SECRET=uma-chave-com-pelo-menos-32-caracteres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Gere uma chave forte com:

```bash
openssl rand -base64 48
```

Instale e prepare o banco:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Deploy no Coolify

### 1. PostgreSQL

No Coolify, crie um recurso PostgreSQL e copie a **Internal Connection String**.

### 2. Aplicação

Crie um novo recurso a partir deste repositório GitHub e selecione **Dockerfile** como método de build.

Variáveis obrigatórias:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_INTERNO:5432/BANCO?schema=public
AUTH_SECRET=SUA_CHAVE_FORTE
NEXT_PUBLIC_APP_URL=https://qr.seudominio.com
```

A porta interna é `3000`.

O próprio container executa antes do servidor:

```bash
prisma migrate deploy
```

Portanto, não é necessário cadastrar um comando manual de migration no Coolify.

### 3. Domínio

Aponte o domínio desejado para a aplicação no Coolify e mantenha `NEXT_PUBLIC_APP_URL` exatamente igual à URL pública, sem `/` no final.

### 4. Healthcheck

Use:

```text
/api/health
```

O Dockerfile também possui `HEALTHCHECK` interno.

### 5. Vidalys

Para observabilidade externa, cadastre `https://SEU_DOMINIO/api/health` no monitor de uptime do Vidalys. Para país dos scans, manter o domínio atrás do Cloudflare permite usar o cabeçalho `CF-IPCountry` sem armazenar o IP do visitante.

## Fluxo de QR Code

```text
scan -> /r/[slug] -> registra ScanMetric + incrementa scanCount -> HTTP 302 -> URL final
```

A falha pontual ao gravar analytics não impede o redirecionamento quando o destino já foi localizado.

## Planos incluídos

| Plano | Limite | Analytics avançado | Preço simulado |
| --- | ---: | --- | ---: |
| Gratuito | 3 QR Codes | Não | R$ 0 |
| Pro | Ilimitado | Sim | R$ 29/mês |
| Enterprise | Ilimitado | Sim | R$ 99/mês |

O checkout é deliberadamente simulado nesta versão. Antes de comercializar, substitua `/api/plans/change` por uma integração real de pagamento e webhook.

## Rotas principais

- `/` — landing page
- `/login` — login
- `/register` — cadastro
- `/dashboard` — criação e gestão
- `/dashboard/analytics/[id]` — analytics avançado
- `/planos` — planos
- `/pricing` — redireciona para `/planos`
- `/r/[slug]` — rastreamento e redirecionamento do QR
- `/api/health` — saúde da aplicação/banco

## Segurança implementada

- JWT assinado com HS256.
- Cookie HttpOnly, SameSite=Lax e Secure em produção.
- Senhas com bcrypt (cost 12).
- Validação de payload com Zod.
- Bloqueio básico de mutações `cross-site` via `Sec-Fetch-Site`.
- Rate limit em memória para login/cadastro.
- Protocolo de destino limitado a HTTP/HTTPS.
- Consultas de QR sempre escopadas pelo usuário autenticado.

Para múltiplas réplicas da aplicação, troque o rate limit em memória por Redis/Valkey para compartilhar contadores entre instâncias.

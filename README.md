# QR Metrics Pro

Gerador de QR Codes dinâmicos com autenticação, planos de uso e analytics, construído com Next.js, TypeScript, Tailwind CSS, Prisma ORM e PostgreSQL. O projeto foi preparado para deploy via Docker Compose/Coolify.

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
- Docker multi-stage.
- Stack Docker Compose pronta para Coolify com PostgreSQL persistente.

## Stack

- Next.js 16.3.4 (App Router)
- React 19.3
- TypeScript
- Tailwind CSS 4
- Prisma ORM 7.10
- PostgreSQL 17
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

Instale e prepare o banco:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Deploy recomendado no Coolify — Docker Compose

O arquivo `docker-compose.yml` na raiz é o método recomendado para este projeto. Ele provisiona a aplicação e o PostgreSQL juntos.

### 1. Criar o recurso

No Coolify:

1. Clique em **New Resource**.
2. Escolha o repositório GitHub `Brunohvg/qrcode-pro-analytics`.
3. Escolha **Docker Compose** como Build Pack/tipo de aplicação.
4. Branch: `main`.
5. Compose file: `/docker-compose.yml`.
6. Salve para o Coolify interpretar a stack.

### 2. Variáveis automáticas

A stack usa as variáveis especiais do próprio Coolify:

- `SERVICE_LOWERCASEUSER_POSTGRES` — usuário PostgreSQL aleatório.
- `SERVICE_PASSWORD_64_POSTGRES` — senha PostgreSQL aleatória de 64 caracteres.
- `SERVICE_REALBASE64_64_AUTH` — segredo JWT forte.
- `SERVICE_URL_APP_3000` — URL pública da aplicação na porta interna 3000.

Não é necessário inventar ou gravar essas credenciais no GitHub.

### 3. Domínio

Depois que o Coolify interpretar o Compose, abra o componente `app` e configure o domínio final, por exemplo:

```text
https://qr.seudominio.com
```

A aplicação utiliza `SERVICE_URL_APP_3000` como `NEXT_PUBLIC_APP_URL`, portanto o QR gerado aponta para a URL pública gerenciada pelo Coolify.

### 4. Banco e migrations

O PostgreSQL não publica porta para a internet. A aplicação acessa o banco pela rede interna do Compose usando o hostname `postgres`.

O volume persistente é:

```text
postgres-data:/var/lib/postgresql/data
```

O container da aplicação executa automaticamente antes do servidor:

```bash
prisma migrate deploy
```

Não é necessário rodar migrations manualmente no primeiro deploy.

### 5. Healthcheck

PostgreSQL usa `pg_isready`. A aplicação possui healthcheck interno em:

```text
/api/health
```

Após o deploy, valide:

```text
https://SEU_DOMINIO/api/health
```

### Alternativa — Dockerfile + PostgreSQL separado

Ainda é possível criar o PostgreSQL como recurso separado no Coolify e subir somente o `Dockerfile`, configurando manualmente:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_INTERNO:5432/BANCO?schema=public
AUTH_SECRET=SUA_CHAVE_FORTE
NEXT_PUBLIC_APP_URL=https://qr.seudominio.com
```

Para este projeto, porém, o Compose é mais simples porque mantém aplicação, banco, credenciais internas, healthchecks e volume no mesmo recurso.

## Vidalys

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

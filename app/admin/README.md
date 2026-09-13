# Área administrativa

A área do proprietário/desenvolvedor fica em `/admin`.

O acesso é permitido quando a sessão autenticada possui `role=ADMIN` ou quando o e-mail está listado na variável de ambiente `DEVELOPER_ADMIN_EMAILS` (valores separados por vírgula).

A área de cobrança e clientes fica em `/admin/billing`.

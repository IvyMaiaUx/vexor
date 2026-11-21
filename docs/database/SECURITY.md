# Modelo de segurança do banco

Este documento descreve **quem pode fazer o quê** e **como isso é garantido**. A fonte da verdade é o SQL em `supabase/migrations/`; se algo mudar lá, atualize aqui.

## 1. Papéis

| Papel | Como é definido | Observações |
|---|---|---|
| **Visitante** (`anon`) | Sem login | Somente leitura de conteúdo público. |
| **Membro** (`member`) | `profiles.role` (padrão) | Publica, responde, sugere recursos. |
| **Moderador** (`moderator`) | `profiles.role` | Tudo do membro + modera catálogo, fórum e denúncias. |
| **Administrador** (`admin`) | `profiles.role` | Tudo do moderador + categorias, usuários/permissões, auditoria, exclusões. |
| **Suspenso** | `profiles.is_suspended = true` | Mantém a conta, mas perde **todos** os privilégios (inclusive de moderador/admin). |

## 2. Defesa em duas camadas

1. **GRANT por coluna.** Colunas sensíveis (`role`, `is_suspended`, `status`, `reviewed_by`, `published_at`, `slug`, `vote_count`, `is_pinned`, `is_locked`, `accepted_post_id`) **não têm permissão de escrita** para o cliente. Mesmo que uma policy tenha um erro, a coluna continua protegida.
2. **RLS por linha.** Define quais linhas cada papel enxerga e altera.

Mudanças de estado e de permissão só acontecem por funções `SECURITY DEFINER` (RPCs), que revalidam o papel do chamador, gravam em `audit_logs` e usam `search_path = ''`.

Colunas de dono (`author_id`, `submitted_by`, `user_id`, `reporter_id`) têm `DEFAULT auth.uid()` e **não são enviadas pelo cliente**; a policy ainda confere `= auth.uid()`.

## 3. Matriz de permissões

Legenda: ✅ permitido · 🔒 somente via RPC · ❌ negado · 👤 apenas o próprio dono

| Tabela | Visitante | Membro | Moderador | Admin |
|---|---|---|---|---|
| `profiles` (ler) | ✅ | ✅ | ✅ | ✅ |
| `profiles` (editar dados) | ❌ | 👤 se ativo (sem `role`/`is_suspended`) | 👤 se ativo | 👤 se ativo |
| `profiles.role` / suspensão | ❌ | ❌ | ❌ | 🔒 `admin_set_user_role`, `admin_set_user_suspension` |
| `categories` (ler) | ✅ ativas | ✅ ativas | ✅ ativas | ✅ todas |
| `categories` (escrever) | ❌ | ❌ | ❌ | ✅ (auditado via trigger `on_category_changed`) |
| `resources` (ler) | ✅ `approved` | ✅ `approved` + as próprias | ✅ todas | ✅ todas |
| `resources` (criar) | ❌ | ✅ sempre como `pending` | ✅ como `pending` | ✅ como `pending` |
| `resources` (editar) | ❌ | 👤 só `pending`/`rejected` | ✅ qualquer | ✅ qualquer |
| `resources` (aprovar/rejeitar/arquivar) | ❌ | ❌ | 🔒 `moderate_resource` | 🔒 `moderate_resource` |
| `resources` (reenviar rejeitado) | ❌ | 🔒 `resubmit_resource` (dono) | — | — |
| `resources` (excluir) | ❌ | 👤 só `pending` | ❌ (usa arquivar) | ✅ |
| `topics` (ler) | ✅ `published` | ✅ + os próprios | ✅ todos | ✅ todos |
| `topics` (criar) | ❌ | ✅ | ✅ | ✅ |
| `topics` (editar título/corpo) | ❌ | 👤 se publicado e não travado | ✅ | ✅ |
| `topics` (ocultar/apagar/fixar/travar) | ❌ | ❌ | 🔒 `moderate_topic` | 🔒 `moderate_topic` |
| `topics` (excluir) | ❌ | 👤 só sem respostas e não travado | ❌ | ✅ |
| `posts` (ler) | ✅ publicados em tópico visível | ✅ + os próprios | ✅ todos | ✅ todos |
| `posts` (criar) | ❌ | ✅ em tópico publicado e não travado | ✅ (mesmo travado) | ✅ (mesmo travado) |
| `posts` (editar corpo) | ❌ | 👤 se tópico publicado e não travado | 👤 (mesmo travado) | 👤 (mesmo travado) |
| `posts` (ocultar/apagar) | ❌ | ❌ | 🔒 `moderate_post` | 🔒 `moderate_post` |
| `posts` (excluir de vez) | ❌ | 👤 se tópico publicado e não travado | 👤 (própria, mesmo travado) | ✅ qualquer |
| Resposta aceita | ❌ | 🔒 `set_accepted_post` (autor, se não travado) | 🔒 (mesmo travado) | 🔒 (mesmo travado) |
| `tags` | ✅ ler | ✅ criar | ✅ editar/excluir | ✅ |
| `topic_tags` | ✅ ler | 👤 no próprio tópico não travado (máx. 5) | ✅ | ✅ |
| `votes` | ❌ | 👤 ver/criar/remover; não vota na própria resposta | 👤 | 👤 |
| `bookmarks` | ❌ | 👤 (só recursos aprovados, membro ativo) | 👤 | 👤 |
| `reports` (criar) | ❌ | ✅ (1 aberta por alvo) | ✅ | ✅ |
| `reports` (ler) | ❌ | 👤 as próprias | ✅ todas | ✅ todas |
| `reports` (tratar) | ❌ | ❌ | 🔒 `resolve_report` | 🔒 `resolve_report` |
| `notifications` | ❌ | 👤 ler/marcar lida/apagar (se ativo) | 👤 | 👤 |
| `audit_logs` | ❌ | ❌ | ❌ | ✅ somente leitura |
| Storage `avatars` | ✅ ler | 👤 escrever em `/<uid>/...` (se ativo) | 👤 | 👤 |

## 4. Ameaças tratadas

| Ameaça | Mitigação |
|---|---|
| **Escalada de privilégio** via API (`PATCH /profiles` com `role: admin`) | `role` fora do GRANT de UPDATE; só `admin_set_user_role`. |
| **Escalada via cadastro** (`raw_user_meta_data` com `role`) | `handle_new_user` ignora metadados exceto `username`/`display_name`, validados. Coberto no teste. |
| **Auto-aprovação** de recurso | `status` fora do GRANT; INSERT exige `status = 'pending'`. |
| **"Approve & swap"** (aprovar link legítimo e trocar por malicioso) | Dono só edita enquanto `pending`/`rejected`. |
| **Link `javascript:`/XSS por URL** | `CHECK` em `resources.url` aceita só `http(s)://`; avatar só `https://`. A UI ainda precisa escapar conteúdo e usar `rel="noopener noreferrer"`. |
| **Falsificar autoria** | `author_id`/`submitted_by` com default `auth.uid()` e policy de conferência. |
| **Manipular votos/contagem** | `vote_count` só por trigger; sem voto na própria resposta; 1 voto por usuário (PK). |
| **Adulteração de auditoria** | Tabela só de inserção; trigger bloqueia `UPDATE`/`DELETE`/`TRUNCATE`; nenhuma policy de escrita. |
| **Admin se trancar para fora** | Admin não rebaixa nem suspende a si mesmo. |
| **`search_path` hijacking** | Todas as funções `SECURITY DEFINER` usam `set search_path = ''`. |
| **Funções internas chamadas pelo cliente** | `EXECUTE` revogado de `public/anon/authenticated` nas funções internas; RPCs públicas exigem `authenticated` e revalidam o papel. Helpers de policy para visitantes (`is_admin`, `is_moderator`, `is_active_member`) continuam executáveis por `anon`; `current_user_role()` só por `authenticated` a partir da migration `20261121150000_public_view_invoker_and_secdef_grants.sql` (⏳ pendente em produção). |
| **View pública lendo com privilégios do owner** | A migration `20261121150000_public_view_invoker_and_secdef_grants.sql` recria `public_profiles` com `security_invoker = true`, para que a RLS de `profiles` valha para quem consulta. Suspensos ficam fora pela policy `profiles_select_public_rows` (helper `is_public_profile`); `anon` só tem `SELECT` nas colunas que a view projeta. ⏳ pendente em produção. |
| **Upload malicioso de avatar** | Bucket limitado a PNG/JPEG/WebP, 2 MB, pasta do próprio usuário ativo (`is_active_member()`); SVG proibido. |
| **Spam de denúncias** | Uma denúncia aberta por usuário e alvo (índices únicos parciais). |
| **Usuário suspenso tentando alterar dados** | Todas as policies de escrita (`profiles`, `bookmarks`, `votes`, `notifications`, `storage.objects`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `reports`) exigem `is_active_member()`. |
| **Adulteração de discussão bloqueada (`is_locked`)** | Membros comuns não conseguem responder, editar/excluir respostas, alterar tags ou trocar a resposta aceita em tópicos travados; moderadores e administradores mantêm suas permissões. |
| **Duplicidade de URLs com variações de host/porta** | `normalize_resource_url(url)` padroniza esquema e host em minúsculas, remove portas padrão (`:80`/`:443`) e barra na raiz vazia, sem colapsar caminhos case-sensitive ou subdiretórios distintos. |
| **Mudanças administrativas em categorias sem rastro** | Trigger `categories_after_change` grava `category.created`, `category.updated` e `category.deleted` em `audit_logs`. |

> **⏳ Pendente em produção.** A migration `20261121150000_public_view_invoker_and_secdef_grants.sql` — `REVOKE EXECUTE` de `current_user_role()` para `anon` e `security_invoker = true` em `public_profiles` (com a policy `profiles_select_public_rows` e o `GRANT` por coluna) — ainda **não foi aplicada no banco de produção**. Enquanto o `supabase db push` não rodar, essas duas mitigações existem apenas no schema versionado e no smoke test do CI; no banco real `anon` continua executando `current_user_role()` e a view segue rodando com privilégios do owner. Por isso o `security:scan` mantém os dois achados como **MÉDIO** em `scripts/security-audit/last-db-audit.json`. Depois do push, reaudite com `scripts/security-audit/supabase-catalog-audit.sql` e regenere o snapshot.

## 5. O que o banco **não** resolve (precisa de outra camada)

- **Rate limiting.** Aplicar nas Server Actions/Route Handlers do Next.js com armazenamento compartilhado no próprio PostgreSQL/Supabase (operações atômicas, tabela restrita sem GRANT direto, limpeza de registros expirados e sem armazenar IPs em texto puro), além dos limites nativos do Supabase Auth (e-mail, captcha).
- **Sanitização de Markdown/HTML** ao renderizar `body` de tópicos e respostas (XSS na exibição).
- **Verificação de e-mail** e política de senha: configurar no Supabase Auth.
- **Varredura de links maliciosos** em recursos submetidos: hoje é revisão humana pela moderação.
- **Anti-spam de tags.** Qualquer membro ativo cria tags (formato validado). Se virar problema, restringir a moderadores.

## 6. Operação

**Primeiro administrador.** Não existe pela API, de propósito. Depois de criar a conta, rode no SQL Editor (papel `postgres`):

```sql
update public.profiles set role = 'admin' where username = 'seu_usuario';
```

**Novas tabelas.** As migrations removem os privilégios padrão do Supabase para `anon`/`authenticated`. Toda tabela nova precisa de `ENABLE ROW LEVEL SECURITY`, `GRANT` explícito (por coluna quando houver colunas sensíveis) e policies. Sem isso, ela fica inacessível pela API (falha segura).

**Chave `service_role`.** Ignora RLS. Nunca no frontend nem no repositório; somente em código de servidor, se necessário.

## 7. Como testar

```bash
supabase db reset                                   # aplica migrations + seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke_test.sql
```

O teste roda em transação e faz rollback. Ele cobre escalada de privilégio, autoaprovação, deduplicação RFC 3986 de URLs, falsificação de autoria, visibilidade por papel, fluxo de moderação, busca textual no fórum, congelamento de tópicos bloqueados, resposta aceita, votos, denúncias, auditoria imutável (incluindo categorias) e bloqueio total de escrita para usuários suspensos. **Rode-o no CI a cada mudança em `supabase/migrations/`.**

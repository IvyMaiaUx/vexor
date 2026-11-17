# VEXOR — Etapa 9.0: Roadmap de Implementação (Etapas 9.1+)

Plano incremental para substituir os dados simulados e `localStorage` pela integração real com o Supabase, preservando SSR, RLS, RPCs `SECURITY DEFINER` e estabilidade da UI.

---

## Visão Geral das Etapas

| Etapa | Escopo Principal | Tabelas / RPCs / Storage Alvo | Pré-requisitos |
| --- | --- | --- | --- |
| **Etapa 9.1 (Concluída / Base)** | Infra Supabase, Auth, SSR Session, Recuperação de Senha, Perfil básico e Diagnóstico 9.0 | `auth.users`, `profiles`, `public_profiles` | Migrations `001..003` aplicadas |
| **Etapa 9.2 — Storage de Avatar & Hardening de Perfil** | Upload real de avatar no bucket `avatars` + remoção/substituição segura em `profile-edit-modal.tsx` | `storage.buckets` (`avatars`), `profiles.avatar_url` | Etapa 9.1 |
| **Etapa 9.3 — Catálogo, Categorias e Favoritos** | Listagem real de `categories` e `resources`, submissão de recursos, reenvio (`resubmit_resource`) e `bookmarks` reais | `categories`, `resources`, `bookmarks`, RPC `resubmit_resource` | Etapa 9.1; seed inicial de categorias/recursos aprovado |
| **Etapa 9.4 — Fórum, Tags, Votos e Solução Aceita** | Tópicos, respostas, tags (respeitando `topic_tags_limit`), votos (`votes`) e marcação de resposta aceita | `topics`, `posts`, `tags`, `topic_tags`, `votes`, RPC `set_accepted_post` | Etapa 9.3 (`categories` populadas) |
| **Etapa 9.5 — Notificações e Denúncias Públicas** | Centro de notificações (`notifications` + `read_at`) e envio de denúncias pelo usuário autenticado | `notifications`, `reports` | Etapas 9.3 e 9.4 |
| **Etapa 9.6 — Painel Administrativo Real (`IAdminDataProvider`)** | Criação de `createSupabaseAdminProvider()` substituindo o provider simulado: Dashboard, Usuários (`admin_set_user_role`, `admin_set_user_suspension`), Moderação (`moderate_resource`, `moderate_topic`, `moderate_post`), Denúncias (`resolve_report`) e Auditoria (`audit_logs`) | `profiles`, `resources`, `topics`, `posts`, `reports`, `audit_logs` + 7 RPCs admin/moderação | Etapas 9.3, 9.4, 9.5 |
| **Etapa 9.7 — Cybercrime Research (Modelagem + Integração)** | Definição de schema (nova migration oficial ou extensão de `resources`), políticas RLS dedicadas e conexão do `ResearchService` e fila de submissão | Nova tabela/migration (ex: `research_entries`) ou extensão aprovada + moderação | Decisão arquitetural + aprovação de migration |
| **Etapa 9.8 — Limpeza Final & Regressão E2E** | Remoção de seeds/chaves `localStorage` obsoletas, auditoria final de RLS/XSS/CSRF/Open Redirect e verificação completa | Todo o sistema | Etapas 9.2 a 9.7 |

---

## Critérios de Aceite por Etapa

1. **Zero uso de `service_role`** no código Next.js (client, server components, route handlers).
2. **Mutações privilegiadas exclusivamente via RPC** (`SECURITY DEFINER`), nunca por `UPDATE` direto em colunas administrativas.
3. **Tratamento explícito de erros RLS/suspensão** (`42501`, usuário suspenso, papel insuficiente) com feedback claro na UI.
4. **Preservação dos testes locais** (`tsc`, `eslint`, suítes de segurança e regressão) + testes de RLS com conta dedicada `member` sem alterar a conta `admin`.

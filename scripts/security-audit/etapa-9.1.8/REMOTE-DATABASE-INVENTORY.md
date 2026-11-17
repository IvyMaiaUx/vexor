# VEXOR — ETAPA 9.1.8: INVENTÁRIO DO BANCO REMOTO (FASE B)

**Projeto alvo:** `zcjudcbckcxwnfnrjfte` (`Vexor`).  
**Fonte verificada (somente leitura via Supabase CLI `3.1.0`):** `npx supabase projects list`.

---

## 1. Metadados Verificados do Projeto Remoto

- **Project Ref:** `zcjudcbckcxwnfnrjfte`
- **Nome:** `Vexor`
- **Região:** `us-east-1`
- **Status:** `ACTIVE_HEALTHY`
- **Host:** `db.zcjudcbckcxwnfnrjfte.supabase.co`
- **Versão do PostgreSQL:** `17.11.0.019` (`postgres_engine: "17"`, `release_channel: "ga"`)
- **Status de vínculo local (`linked`):** `false`

---

## 2. Itens Sem Acesso SQL Direto Nesta Etapa (`NÃO VERIFICADO`)

Como o projeto não está vinculado localmente (`linked: false`), `.env.local` não possui `DATABASE_URL`/senha do banco e esta etapa não autoriza `supabase link`, `login` ou solicitação de senhas/tokens:

- **Schemas internos, extensões instaladas, roles e possíveis objetos conflitantes no PostgreSQL remoto:** `NÃO VERIFICADO`
- **Tabelas (`profiles`, `categories`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `votes`, `bookmarks`, `reports`, `notifications`, `audit_logs`):** `NÃO VERIFICADO`
- **ENUMs, Foreign Keys, Índices, Triggers, Functions/RPCs, Views, Policies RLS, GRANTs e REVOKEs no banco remoto:** `NÃO VERIFICADO`

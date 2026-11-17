# VEXOR — ETAPA 9.1.8.1: COMPATIBILIDADE POSTGRESQL 17 (FASE F)

**Divergência observada:**
- `supabase/config.toml`: `major_version = 15`
- Projeto remoto (`zcjudcbckcxwnfnrjfte`): PostgreSQL `17.11.0.019` (`postgres_engine: "17"`)

---

## Análise Técnica
1. **Compatibilidade das 4 migrations com PostgreSQL 17:**
   - Todos os recursos utilizados (`pgcrypto`, `citext`, `unaccent`, `SECURITY DEFINER`, `SET search_path = ''`, `pg_advisory_xact_lock`, `FOR SHARE NOWAIT`, `FOR UPDATE NOWAIT`, `security_invoker = false`, `security_barrier = true`, `NOT VALID` FK) são nativos e totalmente suportados no PostgreSQL 17 (inclusive já validados localmente em PostgreSQL `18.6`, superior ao `17`).
2. **Extensões necessárias:** `pgcrypto`, `citext`, `unaccent` (schema `extensions`), criadas com `CREATE EXTENSION IF NOT EXISTS` na Migration 1.
3. **Configuração recomendada para `supabase/config.toml`:** atualizar futuramente `major_version = 17` caso venha a usar `supabase start` com Docker local para espelhar a versão exata do remoto. *(Não alterado nesta etapa conforme restrição.)*
4. **Impacto:** Nenhum impacto negativo na aplicação das migrations no remoto; `major_version = 15` afeta apenas o container Docker local se `supabase start` for executado.

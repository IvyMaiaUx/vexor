# VEXOR — ETAPA 9.1.8.2: COMPATIBILIDADE POSTGRESQL 15 × 17 (FASE C)

- **`supabase/config.toml`:** `[db] major_version = 15`
- **Projeto remoto (`zcjudcbckcxwnfnrjfte`):** PostgreSQL `17.11.0.019` (`postgres_engine: "17"`)

## Análise
1. **O que `major_version` controla na CLI (`3.1.0`):** define a versão da imagem Docker do PostgreSQL local iniciada por `supabase start` / `supabase db diff` local. **Não altera a versão nem o comportamento do `supabase db push --remote`.**
2. **Compatibilidade das 4 migrations com PostgreSQL 17:** integralmente compatíveis (`pgcrypto`, `citext`, `unaccent`, `SECURITY DEFINER`, `SET search_path = ''`, `pg_advisory_xact_lock`, `FOR SHARE NOWAIT`, `FOR UPDATE NOWAIT`, `security_invoker = false`, `security_barrier = true`, `NOT VALID` FK).
3. **Configuração recomendada:** após ou paralelamente à futura etapa autorizada, atualizar `major_version = 15` para `major_version = 17` em `supabase/config.toml` (se desejar espelhar o remoto ao usar `supabase start`).
4. **Patch sugerido (não aplicado nesta etapa):**
   ```toml
   [db]
   port = 54322
   shadow_port = 54320
   major_version = 17
   ```
5. **Impacto:** atualizar `major_version` afeta apenas novos containers locais criados via `supabase start` (se já houvesse volume Docker local antigo de PG 15, exigiria recriação do volume local).

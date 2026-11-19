# PLANO DE TESTES — ETAPA 10.3.2.2

1. **Regressão dos testes originais da Fase A** (`run-isolated-pg-tests.sql`) sobre `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`.
2. **Novos testes funcionais e RLS** (`run-revision-2-tests.sql`): `AUD-SEC-01` a `AUD-SEC-05`.
3. **Testes de concorrência paralela em conexões independentes:**
   - Denúncia simultânea da mesma DM pelo mesmo usuário (`23505`, `snapshots|reports = 1|1`).
   - Colisão `NOWAIT` controlada (`55P03`) + rollback + retry bem-sucedido.
   - Rebaixamento concorrente de moderador durante `issue_user_warning` (`42501` pós-lock).
4. **`EXPLAIN (ANALYZE, BUFFERS)`** na consulta de rate limit de `send_direct_message`.
5. **Regressões da aplicação:** `npx tsc --noEmit`, `npx eslint src --max-warnings=0` e todos os 7 scripts `scripts/test-*.mjs`.

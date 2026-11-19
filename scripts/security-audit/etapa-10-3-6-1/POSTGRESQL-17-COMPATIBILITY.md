# COMPATIBILIDADE POSTGRESQL 17.11 — ETAPA 10.3.6.1

- **Validação estática PG 17.11:**
  - `GRANT INSERT (col1, col2, col3) ON TABLE ... TO authenticated`: SQL padrão PostgreSQL (idempotente).
  - `pg_catalog.pg_publication` e `pg_catalog.pg_publication_tables` + `ALTER PUBLICATION ... ADD TABLE`: disponíveis desde PostgreSQL 10+.
  - Bloco `BEGIN; ... DO $$ ... $$; COMMIT;`: totalmente transacional (sem `ALTER TYPE ... ADD VALUE`).
- **Diferenciação explícita:** Os testes runtime foram executados em **PostgreSQL 18 local** (`vexor_etapa10_3_6_1`); testes runtime em **PostgreSQL 17.11** ocorrerão apenas quando a aplicação remota for autorizada.

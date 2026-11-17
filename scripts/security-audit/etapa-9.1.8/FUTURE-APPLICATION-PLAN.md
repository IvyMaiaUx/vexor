# VEXOR — ETAPA 9.1.8: PLANO DE APLICAÇÃO FUTURA (FASE E)

**AVISO:** Nenhum comando abaixo foi executado. A execução exige **nova autorização explícita** do responsável pelo projeto.

---

## 1. Pré-requisitos e Backup
1. Autorização explícita para vincular o projeto (`zcjudcbckcxwnfnrjfte`) e executar inspeção prévia.
2. Gerar backup/snapshot lógico do banco remoto (via painel Supabase ou `pg_dump` somente leitura) antes de qualquer alteração.
3. Confirmar `supabase/config.toml` alinhado ao PostgreSQL 17 remoto (`major_version = 17` se for rodar stack local compatível).

## 2. Verificação de Integridade dos Arquivos Locais
Confirmar hashes SHA-256 antes do envio:
- `20261110000001_schema.sql`: `24763C8E77E5643EFA3214093071760539D65C3A8834E5837CBC70698C7BEE75`
- `20261110000002_functions_triggers.sql`: `89D8F4C6A456ABD523EC660C932AE24F63B10AF3D46C199A2B39D898E5A00D77`
- `20261110000003_rls_and_grants.sql`: `10E8487AB58DA75BAC0A7AEE21DA968EA69FB93F284BB879A7DE96347467F030`
- `20261113143000_security_hardening.sql`: `A8ABA292389CB485F79DD6563D1F57E49FAE7542F2267E5B880AAC90337EB336`

## 3. Ordem Exata e Comandos Documentados (Não Executados)
1. Vincular projeto: `npx supabase link --project-ref zcjudcbckcxwnfnrjfte`
2. Inspecionar histórico remoto (somente leitura): `npx supabase migration list --linked`
3. Simular/validar plano de push (dry-run): `npx supabase db push --dry-run`
4. Aplicar migrations em ordem (`01 -> 02 -> 03 -> 04`): `npx supabase db push`
5. Regenerar tipos TypeScript após aplicação: `npx supabase gen types typescript --linked > src/types/database.types.ts`

## 4. Verificações Pós-Aplicação
- **Migrations:** `npx supabase migration list --linked` mostrando todas as 4 migrations aplicadas.
- **RLS:** confirmar `relrowsecurity = true` nas 12 tabelas e ausência de `profiles_select_public`; confirmar `public_profiles` com `security_barrier = true, security_invoker = false`.
- **Auth & Storage:** confirmar trigger `on_auth_user_created` em `auth.users` e bucket `avatars` com policies em `storage.objects`.
- **Permissões:** confirmar `anon` bloqueado em `public.profiles` (`42501`), `INSERT` direto em `audit_logs` bloqueado (`42501`), e `audit_logs_actor_id_fkey` ausente (Alternativa C).

## 5. Critérios de Sucesso, Interrupção e Rollback
- **Sucesso:** todas as 4 migrations registradas em `schema_migrations`, 0 erros, verificações de RLS/Auth/Storage aprovadas.
- **Interrupção imediata:** divergência prévia em `migration list`, erro em `--dry-run`, ou falha de RLS/permissão pós-aplicação.
- **Rollback da 4ª migration:** executar `scripts/security-audit/etapa-9.1.7/20261113143000_security_hardening.rollback.sql` somente sob autorização explícita (com `audit_logs_actor_id_fkey` recriada como `NOT VALID` se houver registros órfãos).

## 6. Checklist de Aprovação Humana
- [ ] Backup remoto confirmado.
- [ ] `supabase link` + `migration list --linked` inspecionados.
- [ ] `db push --dry-run` revisado.
- [ ] Autorização explícita concedida para `db push`.

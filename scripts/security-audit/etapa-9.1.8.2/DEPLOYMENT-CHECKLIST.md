# VEXOR — ETAPA 9.1.8.2: CHECKLIST DE PRÉ-DEPLOY E PÓS-DEPLOY

## Pré-Deploy (Antes de Autorizar `supabase db push --remote`)
- [x] Destino remoto confirmado: `zcjudcbckcxwnfnrjfte` (`Vexor`, `us-east-1`, PG `17.11.0.019`).
- [x] Hashes SHA-256 das 4 migrations, `seed.sql` e rollback conferidos.
- [x] `npx supabase db push --remote --dry-run --skip-vault` retornou `exit_code = 0` com exatamente as 4 migrations pendentes.
- [ ] **Pendência manual:** Confirmação de backup/ponto inicial pelo responsável no painel Supabase (`BACKUP_CONFIRMATION = PENDING_USER`).
- [ ] **Pendência de autorização:** Aprovação explícita para executar `supabase db push --remote`.

## Pós-Deploy (Após Futura Aplicação Autorizada)
- [ ] Executar `npx supabase migration list --linked` para confirmar as 4 migrations aplicadas.
- [ ] Regenerar tipos TypeScript: `npx supabase gen types typescript --linked > src/types/database.types.ts`.
- [ ] Validar `npx tsc --noEmit`, `npm run lint` e `npx next build --webpack` com os novos types.
- [ ] Verificar RLS, `public.public_profiles` (`security_barrier = true`), `audit_logs` (sem `audit_logs_actor_id_fkey`), Auth (`handle_new_user`) e bucket `avatars`.
- [ ] Decidir separadamente sobre atualização de `major_version = 17` em `supabase/config.toml`.

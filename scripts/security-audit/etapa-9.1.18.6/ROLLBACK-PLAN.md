# Plano de Recuperação e Limpeza (Rollback) — Etapa 9.1.18.6

## Princípios
- **Conta `admin` existente:** jamais modificada ou excluída (além disso, possui proteção contra exclusão do último administrador ativo via `profiles_protect_last_admin_delete`).
- **Execução sem `service_role` nos testes de permissão:** `service_role` não é usado para simular usuário comum; se houver limpeza de conta de teste isolada (T4), ela ocorre apenas em etapa de teardown autorizada.

## Procedimento por Teste

### T1 e T2 (`UPDATE` em `role` e `is_suspended`)
- **Estado esperado:** nenhuma escrita realizada.
- **Recuperação:** caso ocorra mutação inesperada (o que indicaria falha crítica de segurança), registrar evidência imediatamente, abortar os demais testes e restaurar `role = 'member'` / `is_suspended = false` via função administrativa controlada ou revisão de privilégios antes de prosseguir.

### T3 (`UPDATE` em campo permitido, ex. `bio`)
- **Recuperação automática:** capturar `originalBio` antes da mutação e restaurar em bloco `try ... finally` com `supabase.from("profiles").update({ bio: originalBio }).eq("id", user.id)`.
- **Verificação:** executar leitura independente confirmando que `bio` voltou ao valor exato anterior ao teste.

### T4 (Cadastro isolado / trigger `handle_new_user()`)
- **Efeitos gerados:** novo registro em `auth.users`, novo registro em `public.profiles` (cascata `ON DELETE CASCADE` a partir de `auth.users`), eventual envio de e-mail de confirmação.
- **Limpeza aprovada:**
  1. Manter a conta `admin` existente intacta.
  2. Excluir exclusivamente o usuário de teste isolado pelo seu `id` específico (`DELETE FROM auth.users WHERE id = '<isolated_test_user_id>'` ou via Auth Admin API em teardown autorizado), validando que `public.profiles` foi removido em cascata.
  3. Confirmar que `total_users` e `total_profiles` retornaram à contagem inicial.

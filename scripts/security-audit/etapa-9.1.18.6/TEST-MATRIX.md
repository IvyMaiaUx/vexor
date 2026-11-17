# Matriz de Testes de Segurança Remota — Etapa 9.1.18.6

| Teste | Operação pretendida | Resultado esperado | Risco | Recuperação |
|---|---|---|---|---|
| Alteração de role | Tentativa de `UPDATE` na própria coluna `role` via cliente autenticado (`member`) | Bloqueada (SQLSTATE `42501` / PostgREST `permission denied for table/column profiles`) | Elevação de privilégio (se falhar) | Nenhuma escrita esperada; conferir `role` antes e depois |
| Alteração de suspensão | Tentativa de `UPDATE` na própria coluna `is_suspended` via cliente autenticado (`member`) | Bloqueada (SQLSTATE `42501` / PostgREST `permission denied`) | Manipulação de autorização | Nenhuma escrita esperada; conferir `is_suspended` antes e depois |
| Atualização permitida | Alteração de campo permitido (`bio` ou `display_name`) no próprio perfil (`member`) | Autorizada (HTTP `200`/`204`, novo valor persistido) | Baixo (mutação temporária no perfil de teste) | Restaurar valor original capturado antes do teste |
| Trigger de perfil | Cadastro real (`supabase.auth.signUp`) de conta dedicada e isolada | Usuário em `auth.users` e linha em `public.profiles` com `id = auth.users.id`, `role = 'member'`, `is_suspended = false` | Criação de conta e disparo de e-mail de confirmação | Procedimento de limpeza/exclusão aprovado da conta isolada |

## Detalhamento por Teste

### T1 — Tentativa de alteração da própria `profiles.role`
- **Identidade utilizada:** conta de teste dedicada e isolada com `role = 'member'` e `is_suspended = false` (**nunca** a conta `admin` existente).
- **Sessão e privilégios necessários:** sessão autenticada real (`signInWithPassword`) usando apenas chave pública (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Chamada pretendida:** `supabase.from("profiles").update({ role: "admin" }).eq("id", user.id)`.
- **Resultado SQL esperado:** erro de permissão em coluna (`42501` / `permission denied for table profiles` ou `permission denied for column role`) antes mesmo da RLS aprovar escrita.
- **Verificação de integridade:** `SELECT role, updated_at FROM public.profiles WHERE id = <user.id>` antes e depois, confirmando igualdade estrita.
- **Efeitos colaterais / E-mail:** nenhum.
- **Critério objetivo de aprovação:** erro `42501` (não confundir com erro de rede/sessão) e `role` inalterada (`'member'`).

### T2 — Tentativa de alteração da própria `profiles.is_suspended`
- **Identidade utilizada:** mesma conta dedicada `member` (não `admin`).
- **Sessão e privilégios necessários:** sessão autenticada real com chave pública `anon`.
- **Chamada pretendida:** `supabase.from("profiles").update({ is_suspended: true }).eq("id", user.id)`.
- **Resultado SQL esperado:** erro de permissão (`42501` / `permission denied`).
- **Verificação de integridade:** `SELECT is_suspended, updated_at FROM public.profiles WHERE id = <user.id>` antes e depois.
- **Efeitos colaterais / E-mail:** nenhum.
- **Critério objetivo de aprovação:** erro `42501` e `is_suspended = false` mantido.

### T3 — Atualização de campo permitido no próprio perfil
- **Identidade utilizada:** conta dedicada `member` (ou conta de teste isolada em `.env.e2e.local`).
- **Sessão e privilégios necessários:** sessão autenticada real com chave pública `anon`.
- **Chamada pretendida:** `supabase.from("profiles").update({ bio: "E2E temp bio" }).eq("id", user.id)` seguida de `SELECT bio` e restauração `update({ bio: originalBio })`.
- **Resultado SQL esperado:** sucesso (`error: null`) respeitando `profiles_update_own` e coluna `bio` com `GRANT UPDATE`.
- **Verificação de integridade e restauração:** capturar `originalBio` antes; validar persistência via novo `SELECT`; restaurar `originalBio` em bloco `finally` e confirmar igualdade final.
- **Efeitos colaterais / E-mail:** alteração temporária em `bio` e `updated_at`; nenhum e-mail enviado.
- **Critério objetivo de aprovação:** `bio` atualizada com sucesso e posteriormente restaurada ao valor original.

### T4 — Trigger `handle_new_user()` em cadastro de conta isolada
- **Identidade utilizada:** endereço de e-mail dedicado e isolado (`E2E_SIGNUP_EMAIL`), distinto da conta `admin` existente.
- **Sessão e privilégios necessários:** cliente público (`anon`) chamando `supabase.auth.signUp({ email, password, options: { data: { username, display_name } } })`; leitura posterior somente leitura via CLI/admin para verificar correspondência `auth.users.id = public.profiles.id`.
- **Resultado SQL esperado:** inserção em `auth.users` dispara `on_auth_user_created` -> `handle_new_user()` cria 1 linha em `public.profiles` com `id = auth.users.id`, `role = 'member'`, `is_suspended = false`, mesmo que metadados maliciosos tentem incluir `role: 'admin'`.
- **Efeitos colaterais / E-mail:** **envia e-mail real de confirmação** e cria registro real em `auth.users` e `public.profiles`.
- **Recuperação:** remoção controlada da conta de teste isolada após validação (preservando integralmente a conta `admin` existente).
- **Critério objetivo de aprovação:** `profiles.id === auth.users.id`, `role === 'member'`, `is_suspended === false`, sem qualquer `INSERT` direto do cliente.

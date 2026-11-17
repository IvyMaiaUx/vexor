# Etapa 9.1.13 — Profile Creation Integration

- **Data:** 2026-11-13

## 1. Integração com o trigger `handle_new_user()`

Conforme `supabase/migrations/20261110000002_functions_triggers.sql` (linhas 203-236):
- `on_auth_user_created` (`AFTER INSERT ON auth.users`) executa `public.handle_new_user()`.
- O trigger lê `new.raw_user_meta_data ->> 'username'` (validando `^[a-z0-9_]{3,30}$`, com fallback `user_<12hex>` em caso de conflito/inválido) e `new.raw_user_meta_data ->> 'display_name'` (truncado em `60` caracteres com `left(btrim(...), 60)`).
- A coluna `role` é definida exclusivamente pelo banco (`default 'member'`).

## 2. Conformidade no frontend

- O frontend **não** realiza `INSERT` manual em `public.profiles`.
- `src/features/auth/validation.ts` e `src/app/register/page.tsx` agora exigem `displayName` entre `1` e `60` caracteres (`required` e `maxLength={60}`), eliminando a divergência anterior de `80` caracteres frente à constraint `profiles_display_name_len`.
- Conflito potencial documentado: como `useAuthStore` ainda lê `localStorage` para o estado `user` até a Etapa 9.1.14 (login real), um usuário recém-cadastrado no Supabase Auth só refletirá sessão na UI após a implementação do login/hidratação real.

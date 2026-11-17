# ETAPA 9.1.15 — Profile Integration

- **Data:** 2026-11-13

## 1. Consulta e Mapeamento de `public.profiles`

Conforme `src/types/database.types.ts` (linhas 295-310), a consulta em `resolveServerSessionWithClient()` seleciona:
`id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at`.

## 2. Garantias Aplicadas

1. **Correspondência estrita de ID:** `profile.id === user.id` é validado explicitamente; perfis com ID divergente são tratados como `profile_missing` com zero permissões.
2. **Sem criação manual de perfil:** Se `public.profiles` não possuir linha para o `auth.users.id` autenticado, a sessão retorna `profile_missing` (HTTP `403` em rotas protegidas), sem duplicar `handle_new_user()` nem inventar role padrão.
3. **Sem confiança em dados do cliente:** `syncClientSessionFromServer()` sobrescreve qualquer alteração manual em `localStorage` com o perfil retornado por `GET /api/auth/session`.
4. **Imutabilidade de `role` e `is_suspended` no frontend:** O frontend não envia nem altera `role` ou `is_suspended`.

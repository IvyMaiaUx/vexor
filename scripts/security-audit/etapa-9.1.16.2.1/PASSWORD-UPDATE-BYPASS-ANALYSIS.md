# Etapa 9.1.16.2.1 — Análise de Vetores de Bypass na Atualização de Senha

**Escopo:** Comparação entre `updatePasswordWithSupabase()` (camada da aplicação) e chamadas diretas ao SDK (`supabase.auth.updateUser({ password })`) contra o servidor Supabase GoTrue (`/user`).

---

## 1. Proteção na Camada de Aplicação (`updatePasswordWithSupabase`)

Em `src/features/auth/recovery-service.ts`:
1. Valida formato e tamanho mínimo da senha (`newPassword.length >= 8`) e confirmação (`newPassword === confirmPassword`).
2. Invoca `validateRecoverySession(authClient)` **antes** de chamar `authClient.updateUser({ password })`.
3. Se a sessão for inexistente, expirada, tiver `sub !== user.id` ou não possuir `amr: recovery`, `updatePasswordWithSupabase()` retorna `{ status: "session_invalid" }` e **não** dispara a requisição para o GoTrue.

**Resultado:** Qualquer tentativa de chamar `updatePasswordWithSupabase()` ou usar a UI `/auth/reset-password` com uma sessão normal (`password`, `oauth`, `magiclink`) ou sem sessão é bloqueada corretamente.

---

## 2. Chamada Direta ao SDK (`supabase.auth.updateUser({ password })`)

Um usuário já autenticado no navegador (com sessão normal válida, ex.: login por senha) pode abrir o DevTools e executar diretamente:

```js
await supabase.auth.updateUser({ password: "NovaSenhaForte123!" })
```

### Comportamento do Servidor Supabase GoTrue (`/user`)
- Na arquitetura padrão do Supabase Auth (GoTrue), o endpoint `PUT /user` **permite que qualquer usuário autenticado com um JWT válido atualize sua própria senha** (fluxo padrão de *self-service password update* para usuário logado), não exigindo exclusivamente `amr: recovery` no servidor, a menos que políticas adicionais (como reautenticação via nonce/MFA ou *Secure Password Change* com verificação de senha atual/reauthentication) estejam habilitadas na configuração do projeto Supabase.
- **O que isso NÃO permite:**
  - Não permite que um usuário **não autenticado** altere senha alguma (GoTrue retorna `401 Unauthorized`).
  - Não permite que um usuário altere a senha de **outro usuário** (o alvo é sempre o `sub` do JWT autenticado).
- **O que isso significa para o Vexor:**
  - A exigência de `amr: recovery` implementada em `REC-01` protege especificamente a **rota e o serviço de recuperação de senha** (`/auth/reset-password` e `updatePasswordWithSupabase`), garantindo que uma sessão comum não seja tratada como sessão de recuperação de conta dentro do fluxo de recovery da aplicação.
  - A alteração de senha via chamada direta ao `/user` por um usuário **já autenticado** faz parte do modelo padrão de *self-service* do Supabase Auth, sendo mitigada apenas por políticas de reautenticação/MFA no painel do Supabase Auth caso o projeto deseje exigir senha atual ou nonce para usuários já logados.

---

## 3. Conclusão

- **Bypass não autenticado:** Inexistente.
- **Bypass de `updatePasswordWithSupabase`:** Inexistente (protegido por `validateRecoverySession()`).
- **Chamada direta a `supabase.auth.updateUser({ password })` com sessão normal autenticada:** Comportamento padrão do GoTrue `/user` para o próprio usuário autenticado, fora do escopo do fluxo `/auth/reset-password`. Classificado como **INFORMATIVO**.

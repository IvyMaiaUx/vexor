# Etapa 9.1.17.1 — Achados Classificados e Recomendações

| ID | Gravidade | Arquivo / Componente | Exige Alteração |
| :--- | :--- | :--- | :--- |
| **PROF-AUD-01** | `BAIXA` | `src/features/profile/profile-edit-modal.tsx` | Código |
| **PROF-AUD-02** | `BAIXA` | `src/features/auth/use-auth-store.ts` / `profile-edit-modal.tsx` | Código (opcional) |
| **PROF-AUD-03** | `INFORMATIVA` | `src/features/profile/profile-service.ts` / `profile-header.tsx` | Nenhuma |
| **PROF-AUD-04** | `MÉDIA` | `scripts/test-profile-integration-etapa9-1-17.mjs` | Testes futuros (E2E/DOM) |
| **PROF-AUD-05** | `INFORMATIVA` | `src/features/profile/profile-edit-modal.tsx` / `profile-header.tsx` | Etapa futura (Storage) |

---

## Detalhamento

### `PROF-AUD-01` — Gravidade: `BAIXA`
- **Componente:** `src/features/profile/profile-edit-modal.tsx`
- **Evidência técnica:** `ProfileEditModal` permanece montado quando `isOpen === false` e inicializa `useState(profile.*)` apenas no mount inicial.
- **Cenário de falha:** Em troca de usuário na mesma sessão SPA sem recarregar a página, ou caso `profile` seja atualizado externamente antes de abrir o modal, os campos podem exibir valores do mount anterior.
- **Impacto:** Experiência de usuário inconsistente (sem impacto de autorização, pois o servidor valida `auth.uid()`).
- **Recomendação:** Renderizar `{isEditModalOpen && <ProfileEditModal ... />}` ou sincronizar os estados via `useEffect` ao abrir o modal.
- **Exige alteração de:** Código.

### `PROF-AUD-02` — Gravidade: `BAIXA`
- **Componente:** `src/features/auth/use-auth-store.ts` (`setAuthenticatedSession`)
- **Evidência técnica:** `setAuthenticatedSession(result.profile)` sobrescreve `AUTH_SYNC_META_KEY` com `DEFAULT_AUTH_SYNC_META`, zerando `signOutError`.
- **Cenário de falha:** Se houvesse `signOutError: true` pendente e o usuário editasse o perfil, o banner de erro de logout seria ocultado antes de uma nova tentativa de logout.
- **Impacto:** Baixo (efeito apenas cosmético em cenário raro).
- **Recomendação:** Preservar `prevMeta.signOutError` em `setAuthenticatedSession`.
- **Exige alteração de:** Código (opcional).

### `PROF-AUD-03` — Gravidade: `INFORMATIVA`
- **Componente:** `src/features/profile/profile-service.ts` (`mapPublicProfileRowToAuthUserProfile`)
- **Evidência técnica:** Perfis públicos vindos de `public.public_profiles` não possuem `role` e recebem `role: "member"` para exibição em `ProfileHeader`.
- **Impacto:** Nenhum impacto de segurança; comportamento esperado pela privacidade da view `public_profiles`.
- **Exige alteração de:** Nenhuma.

### `PROF-AUD-04` — Gravidade: `MÉDIA`
- **Componente:** `scripts/test-profile-integration-etapa9-1-17.mjs`
- **Evidência técnica:** Todos os testes de perfil executados utilizam mocks offline (`ProfileSupabaseClientLike`).
- **Risco não comprovado:** Comportamento real de RLS, `GRANT UPDATE` por coluna, trigger `handle_new_user()`, view `public_profiles` em PostgreSQL real e interações DOM dos componentes React não foram testados E2E.
- **Recomendação:** Executar validação E2E controlada em ambiente conectado quando autorizado.
- **Exige alteração de:** Testes futuros.

### `PROF-AUD-05` — Gravidade: `INFORMATIVA`
- **Componente:** `src/features/profile/profile-edit-modal.tsx` / `profile-header.tsx`
- **Evidência técnica:** `avatarUrl` aceita URL externa `https://` sem upload integrado ao bucket `avatars`.
- **Impacto:** Exposição padrão de requisição HTTP de imagem a domínios externos informados pelo usuário.
- **Recomendação:** Implementar upload controlado para o bucket `avatars` em etapa futura conforme `AVATAR-STORAGE-REVIEW.md`.
- **Exige alteração de:** Etapa futura.

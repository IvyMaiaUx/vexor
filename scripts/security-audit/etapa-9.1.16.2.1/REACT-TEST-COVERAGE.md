# Etapa 9.1.16.2.1 — Análise da Cobertura de Testes React (`REC-05`)

**Escopo inspecionado:**
- `scripts/test-password-recovery-etapa9-1-16.mjs`
- `scripts/test-recovery-ui-etapa9-1-16-2.mjs`
- `src/app/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`

---

## 1. Separação Real por Camada de Teste

| Camada | Arquivo | O que realmente executa | Tipo real |
| :--- | :--- | :--- | :--- |
| **Serviço (`recovery-service.ts`)** | `scripts/test-password-recovery-etapa9-1-16.mjs` | Executa `requestPasswordRecovery`, `validateRecoverySession`, `updatePasswordWithSupabase`, `loginWithSupabase`, `registerWithSupabase` contra mocks de `authClient`. | Unitário / Integração com mocks offline |
| **Rota Callback (`route.ts`)** | `scripts/test-password-recovery-etapa9-1-16.mjs` | Executa `GET(request)` de `src/app/auth/callback/route.ts` com `NextRequest` e cliente Supabase mockado. | Integração com mocks offline |
| **UI React (`ForgotPasswordPage`, `AuthResetPasswordPage`)** | `scripts/test-recovery-ui-etapa9-1-16-2.mjs` | Compila os componentes `.tsx` via `esbuild` e renderiza HTML estático com `ReactDOMServer.renderToStaticMarkup`. | **SSR Render estático apenas** |
| **E2E / Browser real / Supabase real** | *(nenhum)* | Não há testes com Playwright/Cypress/Supabase real nesta suíte. | **Não coberto** |

---

## 2. Lacunas na Cobertura Comportamental de UI (`AUD-02`)

O script `scripts/test-recovery-ui-etapa9-1-16-2.mjs` verifica com sucesso:
- Que `ForgotPasswordPage` renderiza em SSR o input de e-mail e o botão de envio sem crashes.
- Que `AuthResetPasswordPage` **oculta** os inputs `newPassword` / `confirmPassword` durante a renderização inicial (`"checking"`) e quando `?error=recovery_link_invalid` (`"invalid"`).

Entretanto, como utiliza exclusivamente `renderToStaticMarkup` (sem `jsdom` nem `@testing-library/react`, ausentes nas dependências do projeto):
1. **`useEffect` não é executado:** A chamada inicial a `validateRecoverySession()` e a inscrição em `onAuthStateChange` em `AuthResetPasswordPage` não rodam no teste de UI.
2. **Transições de estado não são testadas no componente:** Não há teste renderizado verificando a transição `"checking" -> "valid"` (exibição do formulário) nem `"valid" -> "invalid"` ao receber `SIGNED_OUT`.
3. **Eventos de formulário e `isSubmitting` não são testados na UI:** Submissão em `ForgotPasswordPage` e `AuthResetPasswordPage`, prevenção de duplo envio (`isSubmitting`), mensagens de erro renderizadas na tela e limpeza/atualização pós-sucesso não são exercitados no DOM.

---

## 3. Classificação

- **Achado `AUD-02` — Severidade: `MÉDIO`**.
- **Justificativa:** Os testes de serviço e callback são genuínos e cobrem bem a lógica e os casos negativos de `REC-01`, mas a camada React UI possui apenas validação de renderização estática SSR (`renderToStaticMarkup`), sem testes comportamentais de DOM/efeitos (`useEffect`, `onAuthStateChange`, `onSubmit`).

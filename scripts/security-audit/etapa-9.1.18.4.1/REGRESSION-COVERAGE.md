# REGRESSION COVERAGE — ETAPA 9.1.18.4.1

Data: 2026-11-14  
Escopo: Verificação de preservação da cobertura das etapas anteriores após o fortalecimento da Etapa 9.1.18.4.

---

| Etapa | Suíte Executada | Preservação Verificada |
| --- | --- | --- |
| 9.1.13 (Cadastro) | `scripts/test-register-etapa9-1-13.mjs` | Tests 1–11 preservados (validação, rede, `confirmation_required`, metadados, anti-enumeração, sem `service_role`/`localStorage`); Test 12 substituído por erros de cadastro e armadilha `from()`, após transferência das verificações de login para 9.1.14. |
| 9.1.14 (Login) | `scripts/test-login-etapa9-1-14.mjs` | Tests 1–9 preservados integralmente; Test 10 atualizado com separação `DEMO_PROFILES`; Test 11 adicionou 4 cenários de erro; Test 12 executa os 6 cenários reais de `GET /api/auth/session`. |
| 9.1.15 (Sessão e Autorização) | `scripts/test-session-auth-etapa9-1-15.mjs` | Todos os 16 testes + Runtime Tests A, B e C preservados e aprovados. |
| 9.1.16 / 9.1.16.2 (Recuperação de senha) | `scripts/test-password-recovery-etapa9-1-16.mjs` e `scripts/test-recovery-ui-etapa9-1-16-2.mjs` | Todos os testes de request, callback PKCE, `amr: recovery`, regressão e SSR preservados e aprovados. |
| 9.1.17 (Integração de perfil) | `scripts/test-profile-integration-etapa9-1-17.mjs` | Leitura, atualização, campos proibidos, `PROF-AUD-01` e `PROF-AUD-02` preservados e aprovados. |
| 9.1.18.2 / 9.1.18.3 | Scripts e docs anteriores | Nenhum documento anterior alterado; achados da 9.1.18.3 tratados nos scripts da 9.1.18.4. |

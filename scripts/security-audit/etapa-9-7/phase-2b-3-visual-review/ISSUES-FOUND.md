# VEXOR — Etapa 9.7 (Fase 2B.3) — Problemas Encontrados (`ISSUES-FOUND.md`)

**Data:** 2026-11-16  

---

## 1. Impedimentos / Problemas Observados

| ID | Gravidade | Categoria | Descrição |
|---|---|---|---|
| **VIS-AUTH-01** | `HIGH` (Impedimento) | Autenticação / Acesso | Não foi possível autenticar a conta administrativa (`maia.operacional@gmail.com`) no ambiente conectado ao Supabase (`zcjudcbckcxwnfnrjfte`): `signInWithPassword` retornou `"Credenciais inválidas ou e-mail ainda não confirmado."`. |
| **VIS-AUTH-02** | `MEDIUM` | Fluxo de Recuperação / Supabase Free | Links PKCE de recuperação de senha (`type=recovery`) falharam quando abertos em contexto de navegador diferente do solicitante (`recovery_link_invalid` / `otp_expired`) e tentativas repetidas atingiram o limite por hora do Supabase Free (`HTTP 429 / over_email_send_rate_limit`). |
| **VIS-UI-01** | `LOW` (Observação visual na tela `/login`) | Interface `/login` | Na tela `/login` (`screenshots/login_gate_desktop_1440x900.png`), o bloco *"Simulador Rápido de Perfis (Modo Pré-Supabase)"* continua visível abaixo do botão *"Entrar na Conta"* mesmo com o backend Supabase integrado. *(Não modificado nesta fase, conforme restrição.)* |

---

## 2. Problemas Causados pela Ausência da Migration Remota

- Como o acesso autenticado ao `/admin` não pôde ser estabelecido, os estados internos de `/admin/research` e `/admin/moderation` não chegaram a ser renderizados visualmente nesta inspeção.

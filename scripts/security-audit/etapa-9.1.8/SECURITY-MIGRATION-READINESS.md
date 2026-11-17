# VEXOR — ETAPA 9.1.8: PRONTIDÃO DA MIGRATION DE SEGURANÇA (`20261113143000_security_hardening.sql`)

**Hash SHA-256 verificado:** `A8ABA292389CB485F79DD6563D1F57E49FAE7542F2267E5B880AAC90337EB336`.

---

## Verificação dos Pressupostos

| Requisito / Pressuposto | Status Local (Testado em `vexor_audit_916` / `9161`) | Status no Remoto (`zcjudcbckcxwnfnrjfte`) |
| :--- | :--- | :--- |
| Proteção do último administrador (`admin_set_user_role`, `admin_set_user_suspension`, `profiles_protect_last_admin_delete`) | **Validado** (incluindo `ON DELETE CASCADE`) | `NÃO VERIFICADO` (aguarda aplicação das Migrations 1–4) |
| Revalidação pós-lock nas 8 RPCs (`FOR SHARE NOWAIT` / `FOR UPDATE NOWAIT`) | **Validado** (`42501` / `55P03`) | `NÃO VERIFICADO` |
| Advisory lock `6216471958360507469` | **Validado** (`Lock\|advisory`) | `NÃO VERIFICADO` |
| Privacidade de `profiles` + view `public_profiles` (`security_barrier = true`) | **Validado** (`42501` direto para `anon`, 10 colunas sem `role`/`is_suspended`) | `NÃO VERIFICADO` |
| Integridade de `audit_logs` (Alternativa C: sem `audit_logs_actor_id_fkey`, `append-only`) | **Validado** (`42501` para `INSERT` direto e `UPDATE`/`DELETE`, `write_audit_log` sem `EXECUTE` para clientes) | `NÃO VERIFICADO` |
| `SECURITY DEFINER` com `SET search_path = ''` e referências qualificadas | **Validado** | `NÃO VERIFICADO` |
| Privilégios `REVOKE ALL` / `GRANT EXECUTE TO authenticated` nas 8 RPCs | **Validado** | `NÃO VERIFICADO` |

**Conclusão:** A migration `20261113143000_security_hardening.sql` está tecnicamente pronta e idempotente, porém depende da verificação prévia do estado remoto (após `supabase link` autorizado) antes de qualquer `db push`.

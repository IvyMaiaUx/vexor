-- =============================================================================
-- VEXOR — ETAPA 9.1.3.4: SCRIPT DE TESTE DE CONCORRÊNCIA E ADVISORY LOCK
-- Arquivo: scripts/security-audit/01-concurrency-advisory-tests.sql
-- Constante de Governança: 6216471958360507469 (0x5645584F5241444D)
-- =============================================================================

-- =============================================================================
-- CENÁRIO C1: RPC Administrativo vs ON DELETE CASCADE no Perfil Alvo
-- =============================================================================
-- Objetivo: Demonstrar prevenção de deadlock quando um usuário está sendo
-- excluído em auth.users enquanto um admin tenta alterar seu papel/suspensão.
-- Ordem de Locks no CASCADE: RowExclusiveLock em auth.users -> RowExclusiveLock em public.profiles.
-- Ordem de Locks no RPC Corrigido: pg_advisory_xact_lock -> SELECT ... FOR UPDATE NOWAIT em public.profiles.

-- SESSÃO 1 (Cascade Delete em Andamento):
BEGIN;
-- Simula início de exclusão em auth.users
-- DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002';
-- Neste ponto, a Sessão 1 detém RowExclusiveLock sobre a linha em profiles.

-- SESSÃO 2 (Admin RPC concorrente executado no mesmo instante):
-- Chama public.admin_set_user_role('00000000-0000-0000-0000-000000000002', 'moderator');
-- 1. Obtém pg_advisory_xact_lock(6216471958360507469).
-- 2. Tenta revalidar e travar o perfil alvo:
--    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_user_id FOR UPDATE NOWAIT;
-- 3. RESULTADO ESPERADO:
--    Em vez de enfileirar e arriscar deadlock com trigger BEFORE DELETE,
--    a instrução falha IMEDIATAMENTE com código 55P03 (lock_not_available).
--    A transação da Sessão 2 aborta limpamente sem travar o banco.

-- SESSÃO 1:
-- COMMIT; -- Conclui exclusão.

-- =============================================================================
-- CENÁRIO C2: Exclusão da Própria Conta do Administrador Chamador Concorrente
-- =============================================================================
-- Objetivo: Garantir que um administrador cuja conta está sendo deletada
-- não consiga executar mutações administrativas antes que a deleção termine.

-- SESSÃO 1 (Exclusão da conta do Admin A iniciada por serviço de conta):
BEGIN;
-- DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';

-- SESSÃO 2 (Admin A tenta executar RPC admin_set_user_role antes do commit da Sessão 1):
-- 1. Obtém pg_advisory_xact_lock(6216471958360507469).
-- 2. Revalida sua própria autorização com NOWAIT:
--    SELECT role, is_suspended INTO v_caller_role, v_caller_suspended
--    FROM public.profiles WHERE id = auth.uid() FOR UPDATE NOWAIT;
-- 3. RESULTADO ESPERADO:
--    Como a linha de Admin A está bloqueada pela Sessão 1 para deleção,
--    o FOR UPDATE NOWAIT dispara imediatamente o erro 55P03 (lock_not_available),
--    impedindo a execução com estado inconsistente.

-- =============================================================================
-- CENÁRIO C3: Administrador Despromovido ou Suspenso Enquanto Aguardava Lock
-- =============================================================================
-- Objetivo: Garantir que a autorização é reavaliada DENTRO da seção crítica
-- protegida pelo advisory lock.

-- SESSÃO 1 (Super Admin C despromove Admin B para 'member'):
BEGIN;
-- Obtém lock: PERFORM pg_advisory_xact_lock(6216471958360507469);
-- UPDATE public.profiles SET role = 'member' WHERE id = 'admin-b-uuid';
-- COMMIT;

-- SESSÃO 2 (Admin B havia disparado admin_set_user_suspension concorrentemente):
-- Ficou enfileirado no pg_advisory_xact_lock(6216471958360507469).
-- Assim que Sessão 1 comita, Sessão 2 acorda e obtém o lock.
-- Revalidação obrigatória:
--   SELECT role, is_suspended INTO v_caller_role, v_caller_suspended
--   FROM public.profiles WHERE id = auth.uid() FOR UPDATE NOWAIT;
--   IF v_caller_role <> 'admin' OR v_caller_suspended THEN
--     RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
--   END IF;
-- RESULTADO ESPERADO: Operação abortada com erro 42501 (forbidden).

-- =============================================================================
-- CENÁRIO C4: Atualização Concorrente de Perfil Comum (Bio/Avatar) vs RPC
-- =============================================================================
-- Objetivo: Demonstrar que mutações de perfil legítimas de membros não entram
-- em conflito nem causam deadlock com o advisory lock administrativo.
-- Atualização de bio:
--   UPDATE public.profiles SET bio = 'Nova bio' WHERE id = auth.uid();
-- Esta instrução adquire apenas RowExclusiveLock sobre a linha do usuário.
-- Não toca no pg_advisory_xact_lock(6216471958360507469).
-- Portanto, operações administrativas e operações de perfil comum operam
-- com isolamento perfeito e sem concorrência de locks globais.

-- =============================================================================
-- CENÁRIO C5: Matriz de Proteção do Último Administrador Ativo
-- =============================================================================
-- Regra Inviolável: COUNT(*) FILTER (WHERE role = 'admin' AND NOT is_suspended) >= 1

-- C5.1: Despromoção do último administrador ativo:
-- Admin A (único admin) tenta: admin_set_user_role(admin_a_uuid, 'member');
-- Bloqueado por: "admins cannot demote themselves" (42501).
-- Se outro admin tenta despromovê-lo quando active_admins = 1:
-- Bloqueado por: "cannot demote the last active administrator" (42501).

-- C5.2: Suspensão do último administrador ativo:
-- Admin A tenta suspender a si mesmo: bloqueado por auto-suspensão (42501).
-- Se outro admin tenta suspender o último ativo:
-- Bloqueado por: "cannot suspend the last active administrator" (42501).

-- C5.3: Exclusão de conta via trigger BEFORE DELETE ON public.profiles:
-- Trigger protect_last_admin_delete() verifica:
--   PERFORM pg_advisory_xact_lock(6216471958360507469);
--   IF OLD.role = 'admin' AND NOT OLD.is_suspended THEN
--     SELECT count(*) INTO v_active_admins FROM public.profiles WHERE role = 'admin' AND NOT is_suspended;
--     IF v_active_admins <= 1 THEN
--       RAISE EXCEPTION 'cannot delete the last active administrator' USING ERRCODE = '42501';
--     END IF;
--   END IF;
-- RESULTADO ESPERADO: Bloqueio garantido com código 42501.

-- C5.4: Dois administradores ativos tentando exclusão/despromoção mútua simultânea:
-- Admin A tenta despromover Admin B, e Admin B tenta despromover Admin A ao mesmo tempo.
-- Graças à serialização estrita pelo pg_advisory_xact_lock(6216471958360507469),
-- uma das transações adquire o lock primeiro. A primeira tem sucesso (resta 1 admin).
-- A segunda acorda, reavalia a contagem dentro da seção crítica, constata active_admins = 1,
-- e falha com "cannot demote the last active administrator".

-- C5.5: Exclusão de conta de administrador JÁ SUSPENSO quando resta 1 administrador ativo:
-- Admin A (ativo) e Admin B (suspenso).
-- Admin B decide excluir sua conta:
-- No trigger: OLD.role = 'admin', mas OLD.is_suspended = TRUE.
-- Portanto, a exclusão NÃO consome o último administrador ATIVO.
-- RESULTADO ESPERADO: Exclusão permitida com sucesso.

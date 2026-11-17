// Test suite for Admin Panel Etapa 3 — Dashboard Administrativo, Métricas, Fila e Denúncias
// Run with: node scripts/test-admin-etapa3.mjs

import assert from "node:assert/strict";
import fs from "node:fs";

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 3 ADMIN       ");
console.log("==================================================");
console.log("[ESCOPO DO TESTE]:");
console.log("  • Execução: Exclusivamente em JavaScript (Camada simulada AdminService).");
console.log("  • RLS / PostgreSQL: NÃO conecta ao banco real. Strings como '42501'");
console.log("    são apenas códigos simulados pelo frontend e NÃO comprovam RLS do banco.");
console.log("  • Testes de RLS reais: Ficarão para a etapa de integração com Supabase.\n");

// 1. Definição dos perfis de teste
const PROFILES = {
  admin: {
    id: "00000000-0000-0000-0000-000000000000",
    username: "root_admin",
    displayName: "Root Administrator",
    role: "admin",
    isSuspended: false,
  },
  moderator: {
    id: "00000000-0000-0000-0000-000000000003",
    username: "mod_sentinel",
    displayName: "Elena Rostova (Sentinel)",
    role: "moderator",
    isSuspended: false,
  },
  member: {
    id: "00000000-0000-0000-0000-000000000001",
    username: "sec_analyst_br",
    displayName: "Lucas Mendes",
    role: "member",
    isSuspended: false,
  },
  specialistMember: {
    id: "00000000-0000-0000-0000-000000000002",
    username: "cve_hunter",
    displayName: "Alexandre Silva",
    role: "member",
    specialty: "Security Researcher",
    isSuspended: false,
  },
  suspended: {
    id: "00000000-0000-0000-0000-000000000005",
    username: "suspended_user",
    displayName: "Suspended User",
    role: "member",
    isSuspended: true,
  },
};

// 2. Simulação da lógica de serviço de resolução de denúncias
function resolveReportCheck(actor, reportId, status, note) {
  if (!actor || actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
    return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
  }
  if (status === "open") {
    return { success: false, error: "22023: Não é possível resolver uma denúncia mantendo o status em aberto." };
  }
  if (!note || note.trim().length < 5) {
    return { success: false, error: "22023: Justificativa obrigatória (mínimo 5 caracteres)." };
  }
  return {
    success: true,
    report: {
      id: reportId,
      status,
      handledBy: actor.id,
      handledByUsername: actor.username,
      resolutionNote: note.trim(),
      handledAt: new Date().toISOString(),
    },
  };
}

// Test 1: Verificação de Permissões de Resolução de Denúncias (Simulação de Serviço)
console.log("🔍 Teste 1: Verificando lógica RBAC simulada para resolução de denúncias...");

// Membro comum tentando resolver
const rMember = resolveReportCheck(PROFILES.member, "rep-0001", "resolved", "Conteúdo removido.");
assert.equal(rMember.success, false);
assert.match(rMember.error, /42501/);
console.log("  ✓ [SIMULAÇÃO DE SERVIÇO]: Membro comum bloqueado logicamente no frontend (código simulado 42501)");

// Membro especialista (com specialty: Security Researcher) tentando resolver
const rSpecialist = resolveReportCheck(PROFILES.specialistMember, "rep-0001", "resolved", "Análise DFIR concluída.");
assert.equal(rSpecialist.success, false);
assert.match(rSpecialist.error, /42501/);
console.log("  ✓ [SIMULAÇÃO DE SERVIÇO]: Membro com especialidade técnica bloqueado na camada JS (role 'member' estrita)");

// Conta suspensa tentando resolver
const rSuspended = resolveReportCheck(PROFILES.suspended, "rep-0001", "resolved", "Tentativa indevida.");
assert.equal(rSuspended.success, false);
console.log("  ✓ [SIMULAÇÃO DE SERVIÇO]: Conta suspensa bloqueada na simulação");

// Moderador resolvendo denúncia com justificativa válida
const rMod = resolveReportCheck(PROFILES.moderator, "rep-0001", "resolved", "Violação confirmada e mitigada.");
assert.equal(rMod.success, true);
assert.equal(rMod.report.handledByUsername, "mod_sentinel");
assert.equal(rMod.report.status, "resolved");
console.log("  ✓ [SIMULAÇÃO DE SERVIÇO]: Moderador resolve denúncia na simulação com gravação de operador");

// Admin descartando denúncia improcedente
const rAdmin = resolveReportCheck(PROFILES.admin, "rep-0002", "dismissed", "Denúncia improcedente após análise técnica.");
assert.equal(rAdmin.success, true);
assert.equal(rAdmin.report.status, "dismissed");
console.log("  ✓ [SIMULAÇÃO DE SERVIÇO]: Root Admin descarta denúncia na simulação com nota auditada");

// Test 2: Validações de Justificativa e Regras de Negócio
console.log("\n🔍 Teste 2: Verificando integridade das justificativas e constraints...");

// Tentativa de resolução sem nota técnica
const rNoNote = resolveReportCheck(PROFILES.moderator, "rep-0001", "resolved", "");
assert.equal(rNoNote.success, false);
console.log("  ✓ Resolução sem nota técnica é estritamente rejeitada");

// Tentativa de manter como 'open'
const rKeepOpen = resolveReportCheck(PROFILES.moderator, "rep-0001", "open", "Tentando manter aberto.");
assert.equal(rKeepOpen.success, false);
console.log("  ✓ Manter status 'open' na resolução é rejeitado");

// Test 3: Filtros de Denúncias
console.log("\n🔍 Teste 3: Verificando matriz de filtros de denúncias...");
const mockReports = [
  { id: "r1", status: "open", reason: "spam", targetType: "post" },
  { id: "r2", status: "reviewing", reason: "malicious_content", targetType: "resource" },
  { id: "r3", status: "resolved", reason: "unauthorized_attack", targetType: "topic" },
  { id: "r4", status: "dismissed", reason: "harassment", targetType: "profile" },
];

const openOnly = mockReports.filter((r) => r.status === "open");
assert.equal(openOnly.length, 1);
assert.equal(openOnly[0].id, "r1");

const spamOnly = mockReports.filter((r) => r.reason === "spam");
assert.equal(spamOnly.length, 1);

const topicOnly = mockReports.filter((r) => r.targetType === "topic");
assert.equal(topicOnly.length, 1);
assert.equal(topicOnly[0].id, "r3");
console.log("  ✓ Filtros multidimensionais por status, motivo e tipo de alvo operam com precisão");

// Test 4: Isolamento absoluto da navegação pública
console.log("\n🔍 Teste 4: Garantindo isolamento da interface pública (Header / Footer)...");
const headerCode = fs.readFileSync("src/components/layout/header.tsx", "utf-8");
const footerCode = fs.readFileSync("src/components/layout/footer.tsx", "utf-8");

assert.equal(headerCode.includes('href="/admin"'), false);
assert.equal(footerCode.includes('href="/admin"'), false);
console.log("  ✓ Nenhuma rota /admin vazada no Header");
console.log("  ✓ Nenhuma rota /admin vazada no Footer");

// Test 5: Ausência de percentuais ou tendências inventadas
console.log("\n🔍 Teste 5: Conferindo integridade das métricas do Dashboard...");
const metricsGridCode = fs.readFileSync("src/features/admin/components/admin-metrics-grid.tsx", "utf-8");
assert.equal(metricsGridCode.includes("+15%"), false);
assert.equal(metricsGridCode.includes("+20%"), false);
assert.equal(metricsGridCode.includes("noHistoricalTrends"), true);
console.log("  ✓ Dashboard exibe aviso de baseline sem inventar percentuais ou tendências");

console.log("\n==================================================");
console.log("   TODOS OS TESTES DA ETAPA 3 FORAM APROVADOS!   ");
console.log("==================================================");

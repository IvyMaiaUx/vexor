# VEXOR — Etapa 9.5: Limitações e Riscos

1. **Criação de notificações pelo cliente:** Não é permitida pelo schema/RLS (`notifications` é gravada apenas por triggers e RPCs `SECURITY DEFINER`), comportamento preservado integralmente.
2. **Denúncia de perfil na UI pública:** `report-service.ts` implementa suporte completo a `profile_id` (validado em testes), porém `/profile/[username]` ainda utiliza dados demonstrativos (`DEMO_PROFILES`) até a integração pública de perfis, não possuindo UUID real de perfil no banco para acionar o modal na rota pública.
3. **Moderação administrativa de denúncias:** O painel `/admin/reports` permanece em modo demonstrativo, conforme escopo da Etapa 9.5 (resolução real via `resolve_report` pertence a etapa futura do painel administrativo).
4. **Validação de RLS em runtime:** Todos os testes da Etapa 9.5 utilizaram mocks offline; policies RLS e triggers no PostgreSQL remoto não foram exercitados em runtime nesta etapa.

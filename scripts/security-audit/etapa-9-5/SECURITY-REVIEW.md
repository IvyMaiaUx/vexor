# VEXOR — Etapa 9.5: Revisão de Segurança e Privacidade

## 1. Controles Aplicados
- **Isolamento por usuário (`notifications`):** `fetchUserNotifications`, `fetchUnreadNotificationCount`, `markNotificationAsRead` e `markAllNotificationsAsRead` exigem sessão autenticada, filtram por `user.id` da sessão e rejeitam qualquer tentativa de informar `requestedUserId` diferente ou chaves proibidas (`user_id`, `type`, `actor_id`, `topic_id`, `post_id`, `resource_id`, `created_at`).
- **Links seguros:** `buildNotificationTargetHref` valida UUIDs e slugs (`^[a-z0-9-]+$`) e constrói apenas caminhos relativos internos, impedindo redirecionamentos externos ou XSS via `javascript:`.
- **Anti-spoofing em `reports`:** `submitContentReport` rejeita qualquer envio de `id`, `reporter_id`, `status`, `handled_by`, `handled_at`, `resolution_note` ou `created_at`, enviando apenas `(topic_id, post_id, resource_id, profile_id, reason, details)` com exatamente um alvo não nulo.
- **Sigilo do denunciante:** `PublicReportReceipt` omite `reporter_id`, `handled_by`, `handled_at` e `resolution_note`. `fetchOwnReports` permite apenas `reporter_id = user.id` e bloqueia consultas cruzadas.
- **Prevenção de concorrência:** Guardas single-flight (`inFlightRef`, `inFlightMarkRef`) no formulário de denúncia e no menu de notificações.
- **Privacidade de perfis:** Autores de eventos em notificações são consultados exclusivamente via `public.public_profiles`.

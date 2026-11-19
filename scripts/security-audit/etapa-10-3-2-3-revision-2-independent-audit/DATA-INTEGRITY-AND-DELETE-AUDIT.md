# AUDITORIA DE INTEGRIDADE REFERENCIAL E EXCLUSÕES

## 1. Análise de Foreign Keys e `ON DELETE`
| Tabela / Coluna | Alvo | Ação `ON DELETE` | Risco Avaliado |
|---|---|---|---|
| `reported_message_snapshots.message_id` | Sem FK para `direct_messages` | Preserva snapshot | **Seguro:** evidência sobrevive à exclusão da DM. |
| `reported_message_snapshots.conversation_id` | Sem FK para `direct_conversations` | Preserva snapshot | **Seguro:** evidência sobrevive à exclusão da conversa/usuário. |
| `reported_message_snapshots.sender_id` / `captured_by` | `profiles(id)` | `SET NULL` | **Seguro:** preserva texto e timestamp mesmo se conta for excluída. |
| `reports.message_snapshot_id` | `reported_message_snapshots(id)` | `CASCADE` | Coerente (snapshot não pode ser apagado por usuários). |
| `reports.message_id` | Sem FK | Preserva referência | **Seguro.** |
| `user_warnings.user_id` | `profiles(id)` | `CASCADE` | Coerente ao deletar conta. |
| `user_warnings.moderator_id` / `revoked_by` | `profiles(id)` | `SET NULL` | Preserva histórico da advertência se moderador sair. |
| `direct_conversations.participant_low` / `high` | `profiles(id)` | `CASCADE` | Deleta conversa se um dos perfis for excluído fisicamente (snapshots permanecem). |
| `notifications.conversation_id` / `message_id` / `warning_id` | Respectivas tabelas | `CASCADE` | Evita notificações órfãs apontando para alvos inexistentes. |
| `topic_votes` | `profiles(id)` / `topics(id)` | `CASCADE` | Consistente com `votes` existente. |

## 2. Conclusão
Nenhuma exclusão de usuário, conversa, mensagem ou tópico consegue apagar evidências em `reported_message_snapshots` ou deixar referências quebradas.

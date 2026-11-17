# SESSION ENDPOINT TESTS — ETAPA 9.1.18.4.2

Achado corrigido: `BAIXO-01`  
Arquivo: `scripts/test-session-endpoint-etapa9-1-18-4.mjs` (Scenarios 4a, 4b, 4c e 7)

---

## Subcasos de `connection_error` Executados contra `GET()` Real

| Subcaso | Falha Simulada | Verificações (`assertConnectionErrorContract`) |
| --- | --- | --- |
| **4a** | `auth.getUser()` lança `Error("ECONNREFUSED postgres://user:secret_dsn@db.internal:5432/vexor")` | HTTP `503`, `Cache-Control: no-store`, `authenticated: false`, `status: "connection_error"`, `user: null`, `profile: null`, `isAuthenticated: false`, sem vazamento de DSN/segredo no JSON. |
| **4b** | `from("profiles")...maybeSingle()` retorna `{ data: null, error: { message: "DB connection timeout: postgres://..." } }` | HTTP `503`, `Cache-Control: no-store`, `status: "connection_error"`, sem vazamento de mensagem interna no JSON. |
| **4c** | `from("profiles")...maybeSingle()` lança `Error("ECONNRESET postgres://user:secret_dsn@10.0.0.5:5432/vexor")` | HTTP `503`, `Cache-Control: no-store`, `status: "connection_error"`, sem vazamento de IP/DSN no JSON. |

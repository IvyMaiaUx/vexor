import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(ROOT, "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/client") {
      return {
        url: "data:text/javascript,export function createClient(){throw new Error('Mock client required');}",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      const candidate = path.join(SRC_ROOT, specifier.slice(2));
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        if (fs.existsSync(candidate + ext)) {
          return nextResolve(pathToFileURL(candidate + ext).href, context);
        }
      }
      if (fs.existsSync(path.join(candidate, "index.ts"))) {
        return nextResolve(
          pathToFileURL(path.join(candidate, "index.ts")).href,
          context
        );
      }
    }
    return nextResolve(specifier, context);
  },
});

const {
  buildNotificationTargetHref,
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} = await import("../src/features/notifications/notification-service.ts");

const { fetchOwnReports, submitContentReport } = await import(
  "../src/features/reports/report-service.ts"
);

const UUIDS = {
  userA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  topic1: "11111111-1111-4111-8111-111111111111",
  post1: "22222222-2222-4222-8222-222222222222",
  resource1: "33333333-3333-4333-8333-333333333333",
  missingTarget: "99999999-9999-4999-8999-999999999999",
  notif1: "44444444-4444-4444-8444-444444444441",
  notif2: "44444444-4444-4444-8444-444444444442",
  notif3: "44444444-4444-4444-8444-444444444443",
  notifOther: "44444444-4444-4444-8444-444444444499",
};

function createMockDb() {
  return {
    public_profiles: [
      { id: UUIDS.userA, username: "alice_sec", display_name: "Alice" },
      { id: UUIDS.userB, username: "bob_blue", display_name: "Bob" },
    ],
    resources: [{ id: UUIDS.resource1, slug: "nmap-scanner" }],
    topics: [{ id: UUIDS.topic1 }],
    posts: [{ id: UUIDS.post1 }],
    notifications: [
      {
        id: UUIDS.notif1,
        user_id: UUIDS.userA,
        type: "topic_reply",
        actor_id: UUIDS.userB,
        topic_id: UUIDS.topic1,
        post_id: UUIDS.post1,
        resource_id: null,
        read_at: null,
        created_at: "2026-11-15T10:00:00Z",
      },
      {
        id: UUIDS.notif2,
        user_id: UUIDS.userA,
        type: "resource_approved",
        actor_id: UUIDS.userB,
        topic_id: null,
        post_id: null,
        resource_id: UUIDS.resource1,
        read_at: null,
        created_at: "2026-11-15T12:00:00Z",
      },
      {
        id: UUIDS.notif3,
        user_id: UUIDS.userA,
        type: "solution_accepted",
        actor_id: UUIDS.userB,
        topic_id: UUIDS.topic1,
        post_id: UUIDS.post1,
        resource_id: null,
        read_at: "2026-11-15T09:00:00Z",
        created_at: "2026-11-15T08:00:00Z",
      },
      {
        id: UUIDS.notifOther,
        user_id: UUIDS.userB,
        type: "topic_reply",
        actor_id: UUIDS.userA,
        topic_id: UUIDS.topic1,
        post_id: UUIDS.post1,
        resource_id: null,
        read_at: null,
        created_at: "2026-11-15T13:00:00Z",
      },
    ],
    reports: [],
  };
}

function createMockSupabase({
  db,
  currentUserId = null,
  throwConnectionError = false,
  forceErrorTable = null,
  recordedPayloads = [],
} = {}) {
  return {
    auth: {
      async getUser() {
        if (throwConnectionError) {
          throw new Error("Network failure");
        }
        return {
          data: { user: currentUserId ? { id: currentUserId } : null },
          error: null,
        };
      },
    },
    from(table) {
      const state = {
        op: "select",
        filters: [],
        orders: [],
        range: null,
        head: false,
        payload: null,
        singleMode: null,
      };

      const execute = () => {
        if (throwConnectionError) {
          throw new Error("Connection reset");
        }
        if (forceErrorTable === table) {
          return {
            data: null,
            count: null,
            error: { message: `Simulated DB error on ${table}` },
          };
        }

        if (state.op === "insert" && table === "reports") {
          recordedPayloads.push({ table, op: "insert", payload: state.payload });
          if (!currentUserId) {
            return { data: null, error: { code: "42501", message: "RLS denied" } };
          }
          const p = state.payload;
          // Enforce FK check
          if (p.topic_id && !db.topics.some((t) => t.id === p.topic_id)) {
            return { data: null, error: { code: "23503", message: "topic FK failed" } };
          }
          if (p.post_id && !db.posts.some((t) => t.id === p.post_id)) {
            return { data: null, error: { code: "23503", message: "post FK failed" } };
          }
          if (p.resource_id && !db.resources.some((t) => t.id === p.resource_id)) {
            return { data: null, error: { code: "23503", message: "resource FK failed" } };
          }
          if (p.profile_id && !db.public_profiles.some((t) => t.id === p.profile_id)) {
            return { data: null, error: { code: "23503", message: "profile FK failed" } };
          }

          // Enforce dedupe index
          const dup = db.reports.find(
            (r) =>
              r.reporter_id === currentUserId &&
              ["open", "reviewing"].includes(r.status) &&
              ((p.topic_id && r.topic_id === p.topic_id) ||
                (p.post_id && r.post_id === p.post_id) ||
                (p.resource_id && r.resource_id === p.resource_id) ||
                (p.profile_id && r.profile_id === p.profile_id))
          );
          if (dup) {
            return { data: null, error: { code: "23505", message: "duplicate report" } };
          }

          const row = {
            id: `55555555-5555-4555-8555-${String(db.reports.length + 1).padStart(12, "0")}`,
            reporter_id: currentUserId,
            topic_id: p.topic_id ?? null,
            post_id: p.post_id ?? null,
            resource_id: p.resource_id ?? null,
            profile_id: p.profile_id ?? null,
            reason: p.reason,
            details: p.details ?? null,
            status: "open",
            handled_by: null,
            handled_at: null,
            resolution_note: null,
            created_at: new Date().toISOString(),
          };
          db.reports.push(row);
          return { data: row, error: null };
        }

        if (state.op === "update" && table === "notifications") {
          recordedPayloads.push({ table, op: "update", payload: state.payload });
          let rows = [...db.notifications];
          for (const f of state.filters) {
            if (f.type === "eq") rows = rows.filter((r) => r[f.col] === f.val);
            if (f.type === "is_null") rows = rows.filter((r) => r[f.col] === null);
          }
          for (const r of rows) {
            if (r.user_id === currentUserId) {
              r.read_at = state.payload.read_at;
            }
          }
          if (state.singleMode === "maybeSingle") {
            return { data: rows[0] ?? null, error: null };
          }
          return { data: rows, error: null };
        }

        // SELECT
        let rows = [...(db[table] ?? [])];
        for (const f of state.filters) {
          if (f.type === "eq") rows = rows.filter((r) => r[f.col] === f.val);
          if (f.type === "in") rows = rows.filter((r) => f.val.includes(r[f.col]));
          if (f.type === "is_null") rows = rows.filter((r) => r[f.col] === null);
        }
        for (const o of state.orders) {
          rows.sort((a, b) =>
            o.ascending
              ? String(a[o.col]).localeCompare(String(b[o.col]))
              : String(b[o.col]).localeCompare(String(a[o.col]))
          );
        }
        const totalCount = rows.length;
        if (state.range) {
          rows = rows.slice(state.range.from, state.range.to + 1);
        }
        if (state.head) {
          return { data: null, count: totalCount, error: null };
        }
        return { data: rows, count: totalCount, error: null };
      };

      const builder = {
        select(_cols, opts) {
          if (opts?.head) state.head = true;
          return builder;
        },
        insert(payload) {
          state.op = "insert";
          state.payload = payload;
          return builder;
        },
        update(payload) {
          state.op = "update";
          state.payload = payload;
          return builder;
        },
        eq(col, val) {
          state.filters.push({ type: "eq", col, val });
          return builder;
        },
        in(col, val) {
          state.filters.push({ type: "in", col, val });
          return builder;
        },
        is(col, val) {
          if (val === null) state.filters.push({ type: "is_null", col });
          return builder;
        },
        order(col, opts) {
          state.orders.push({ col, ascending: opts?.ascending ?? true });
          return builder;
        },
        range(from, to) {
          state.range = { from, to };
          return builder;
        },
        maybeSingle() {
          state.singleMode = "maybeSingle";
          return Promise.resolve(execute());
        },
        single() {
          state.singleMode = "single";
          return Promise.resolve(execute());
        },
        then(resolve, reject) {
          return Promise.resolve(execute()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

async function run() {
  console.log("=== ETAPA 9.5 — NOTIFICATIONS & REPORTS TESTS ===");

  // 1, 3, 4, 5: Own notifications, pagination, ordering, unread count
  {
    const db = createMockDb();
    const clientA = createMockSupabase({ db, currentUserId: UUIDS.userA });
    const page1 = await fetchUserNotifications({
      page: 1,
      pageSize: 2,
      client: clientA,
    });
    assert.equal(page1.status, "success");
    assert.equal(page1.totalCount, 3);
    assert.equal(page1.totalPages, 2);
    assert.equal(page1.items.length, 2);
    assert.equal(page1.items[0].id, UUIDS.notif2); // newest first
    assert.equal(page1.items[0].targetHref, "/catalog/nmap-scanner");
    assert.equal(page1.items[1].id, UUIDS.notif1);
    assert.equal(
      page1.items[1].targetHref,
      `/forum/${UUIDS.topic1}#post-${UUIDS.post1}`
    );

    const unread = await fetchUnreadNotificationCount({ client: clientA });
    assert.equal(unread.status, "success");
    assert.equal(unread.unreadCount, 2);
    console.log("  ✓ 1, 3, 4 & 5. Listagem própria, paginação, ordenação e contagem de não lidas");
  }

  // 2: Empty notifications
  {
    const db = createMockDb();
    db.notifications = [];
    const clientA = createMockSupabase({ db, currentUserId: UUIDS.userA });
    const res = await fetchUserNotifications({ client: clientA });
    assert.equal(res.status, "success");
    assert.equal(res.items.length, 0);
    console.log("  ✓ 2. Estado vazio de notificações");
  }

  // 6, 7, 8, 9, 10: Mark one, mark all, cross-user block, recipient spoof block, connection error
  {
    const db = createMockDb();
    const recorded = [];
    const clientA = createMockSupabase({
      db,
      currentUserId: UUIDS.userA,
      recordedPayloads: recorded,
    });

    const markOne = await markNotificationAsRead(UUIDS.notif1, { client: clientA });
    assert.equal(markOne.status, "success");
    const updateEntry = recorded.find((r) => r.table === "notifications");
    assert.deepEqual(Object.keys(updateEntry.payload), ["read_at"]);

    const markOther = await markNotificationAsRead(UUIDS.notifOther, {
      client: clientA,
    });
    assert.equal(markOther.status, "error");
    assert.equal(markOther.errorCode, "not_found");

    const crossUserRead = await fetchUserNotifications({
      requestedUserId: UUIDS.userB,
      client: clientA,
    });
    assert.equal(crossUserRead.status, "error");

    const spoofRecipient = await markNotificationAsRead(UUIDS.notif1, {
      client: clientA,
      extraFields: { user_id: UUIDS.userB },
    });
    assert.equal(spoofRecipient.status, "error");
    assert.equal(spoofRecipient.errorCode, "validation_error");

    const markAll = await markAllNotificationsAsRead({ client: clientA });
    assert.equal(markAll.status, "success");
    const unreadAfter = await fetchUnreadNotificationCount({ client: clientA });
    assert.equal(unreadAfter.unreadCount, 0);

    const connClient = createMockSupabase({ db, throwConnectionError: true });
    const connErr = await fetchUserNotifications({ client: connClient });
    assert.equal(connErr.status, "error");
    console.log("  ✓ 6, 7, 8, 9 & 10. Marcar lida(s), bloqueio cruzado/spoof e erro de conexão");
  }

  // Safe internal link validation
  {
    const href = buildNotificationTargetHref(
      {
        type: "resource_approved",
        topic_id: null,
        post_id: null,
        resource_id: UUIDS.resource1,
      },
      new Map([[UUIDS.resource1, "https://evil.example"]])
    );
    assert.equal(href, "/catalog");
  }

  // 11, 12, 13, 14: Create reports for topic, post, resource, profile
  {
    const db = createMockDb();
    const recorded = [];
    const clientA = createMockSupabase({
      db,
      currentUserId: UUIDS.userA,
      recordedPayloads: recorded,
    });

    for (const [targetType, targetId] of [
      ["topic", UUIDS.topic1],
      ["post", UUIDS.post1],
      ["resource", UUIDS.resource1],
      ["profile", UUIDS.userB],
    ]) {
      const res = await submitContentReport(
        { targetType, targetId, reason: "spam", details: `Teste ${targetType}` },
        { client: clientA }
      );
      assert.equal(res.status, "success");
      assert.equal(res.report.status, "open");
      assert.equal("reporter_id" in res.report, false);
      assert.equal("handled_by" in res.report, false);
    }

    const firstInsert = recorded.find((r) => r.table === "reports");
    assert.deepEqual(Object.keys(firstInsert.payload).sort(), [
      "details",
      "post_id",
      "profile_id",
      "reason",
      "resource_id",
      "topic_id",
    ]);
    console.log("  ✓ 11, 12, 13, 14 & 22. Denúncias de tópico/post/recurso/perfil e sigilo do denunciante");
  }

  // 15, 16, 17, 18, 19, 20, 21, 23, 25: Auth, spoof, duplicate, missing/invalid target, cross-user reports, reason validation, DB error
  {
    const db = createMockDb();
    const anonClient = createMockSupabase({ db, currentUserId: null });
    const unauth = await submitContentReport(
      { targetType: "topic", targetId: UUIDS.topic1, reason: "spam" },
      { client: anonClient }
    );
    assert.equal(unauth.status, "error");
    assert.equal(unauth.errorCode, "unauthenticated");

    const clientA = createMockSupabase({ db, currentUserId: UUIDS.userA });

    const spoofReporter = await submitContentReport(
      {
        targetType: "topic",
        targetId: UUIDS.topic1,
        reason: "spam",
        reporter_id: UUIDS.userB,
      },
      { client: clientA }
    );
    assert.equal(spoofReporter.status, "error");
    assert.equal(spoofReporter.errorCode, "validation_error");

    const spoofStatus = await submitContentReport(
      {
        targetType: "topic",
        targetId: UUIDS.topic1,
        reason: "spam",
        status: "resolved",
      },
      { client: clientA }
    );
    assert.equal(spoofStatus.status, "error");
    assert.equal(spoofStatus.errorCode, "validation_error");

    const badReason = await submitContentReport(
      {
        targetType: "topic",
        targetId: UUIDS.topic1,
        reason: "invalid_reason",
      },
      { client: clientA }
    );
    assert.equal(badReason.status, "error");
    assert.equal(badReason.errorCode, "validation_error");

    const invalidTarget = await submitContentReport(
      { targetType: "topic", targetId: "not-a-uuid", reason: "spam" },
      { client: clientA }
    );
    assert.equal(invalidTarget.status, "error");
    assert.equal(invalidTarget.errorCode, "validation_error");

    const missingTarget = await submitContentReport(
      { targetType: "topic", targetId: UUIDS.missingTarget, reason: "spam" },
      { client: clientA }
    );
    assert.equal(missingTarget.status, "error");
    assert.equal(missingTarget.errorCode, "not_found");

    const okFirst = await submitContentReport(
      { targetType: "topic", targetId: UUIDS.topic1, reason: "spam" },
      { client: clientA }
    );
    assert.equal(okFirst.status, "success");

    const dup = await submitContentReport(
      { targetType: "topic", targetId: UUIDS.topic1, reason: "spam" },
      { client: clientA }
    );
    assert.equal(dup.status, "error");
    assert.equal(dup.errorCode, "duplicate");

    const crossReports = await fetchOwnReports({
      requestedUserId: UUIDS.userB,
      client: clientA,
    });
    assert.equal(crossReports.status, "error");

    const dbErrClient = createMockSupabase({
      db,
      currentUserId: UUIDS.userA,
      forceErrorTable: "reports",
    });
    const dbErr = await submitContentReport(
      { targetType: "post", targetId: UUIDS.post1, reason: "harassment" },
      { client: dbErrClient }
    );
    assert.equal(dbErr.status, "error");
    console.log("  ✓ 15-21, 23 & 25. Auth, anti-spoofing, duplicidade, alvos inválidos/inexistentes e erros");
  }

  // 24: Single-flight guards in UI components
  {
    const bellSrc = fs.readFileSync(
      path.join(ROOT, "src/features/notifications/notification-bell.tsx"),
      "utf8"
    );
    const modalSrc = fs.readFileSync(
      path.join(ROOT, "src/features/reports/report-modal.tsx"),
      "utf8"
    );
    assert.ok(bellSrc.includes("inFlightMarkRef"));
    assert.ok(modalSrc.includes("inFlightRef"));
    console.log("  ✓ 24. Prevenção de envio duplicado (single-flight guards)");
  }

  console.log("=== ALL ETAPA 9.5 NOTIFICATIONS & REPORTS TESTS PASSED ===");
}

run().catch((err) => {
  console.error("ETAPA 9.5 TEST FAILED:", err);
  process.exit(1);
});

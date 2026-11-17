"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { UserActivityEvent } from "./types";

const ACTIVITIES_STORAGE_KEY = "cybersec_user_activities";
const ACTIVITY_STORE_EVENT = "cybersec-activity-change";

const INITIAL_ACTIVITIES: UserActivityEvent[] = [
  {
    id: "act-1",
    category: "catalog",
    title_pt: "Visualizou um recurso do catálogo",
    title_en: "Viewed a catalog resource",
    detail_pt: "OWASP Top 10 · Catálogo Oficial de Vulnerabilidades Web",
    detail_en: "OWASP Top 10 · Web Vulnerabilities Catalog",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // ~18m ago
    link: "/catalog",
    badgeLabel: "Catálogo",
    icon: "📖",
    targetKey: "view:resource:owasp-top-10",
  },
  {
    id: "act-2",
    category: "forum",
    title_pt: "Respondeu a uma discussão técnica",
    title_en: "Posted a technical reply",
    detail_pt: "Análise de artefatos de memória com Volatility 3 em dumps do Windows",
    detail_en: "Analyzing memory artifacts with Volatility 3 in Windows dumps",
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // ~1.5h ago
    link: "/forum/topic-2",
    badgeLabel: "Fórum",
    icon: "💬",
    targetKey: "reply:topic-2",
  },
  {
    id: "act-3",
    category: "bookmarks",
    title_pt: "Salvou um recurso nos favoritos",
    title_en: "Bookmarked a resource",
    detail_pt: "Sigma Rules Repository · Regras genéricas para SIEM",
    detail_en: "Sigma Rules Repository · Generic SIEM detection rules",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString(), // ~19h ago
    link: "/catalog/bookmarks",
    badgeLabel: "Favoritos",
    icon: "★",
    targetKey: "bookmark:sigma-rules",
  },
  {
    id: "act-4",
    category: "forum",
    title_pt: "Criou uma discussão técnica",
    title_en: "Started a technical discussion",
    detail_pt: "Detecção de persistência via Tarefas Agendadas no Windows Server",
    detail_en: "Detecting persistence via Scheduled Tasks in Windows Server",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // yesterday
    link: "/forum/topic-1",
    badgeLabel: "Fórum",
    icon: "⚡",
    targetKey: "topic:topic-1",
  },
  {
    id: "act-5",
    category: "contributions",
    title_pt: "Submeteu uma ferramenta ao catálogo",
    title_en: "Submitted a defensive tool",
    detail_pt: "Sysmon Modular Config · Repositório de telemetria",
    detail_en: "Sysmon Modular Config · Telemetry configuration repo",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    link: "/my-contributions",
    badgeLabel: "Contribuições",
    icon: "📦",
    targetKey: "submit:sysmon-modular",
  },
  {
    id: "act-6",
    category: "profile",
    title_pt: "Atualizou informações públicas do perfil",
    title_en: "Updated public profile details",
    detail_pt: "Biografia técnica e novas áreas de interesse adicionadas",
    detail_en: "Technical bio and new interest areas updated",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    link: "/profile",
    badgeLabel: "Perfil",
    icon: "👤",
    targetKey: "profile:update",
  },
];

function notifyActivityListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVITY_STORE_EVENT));
  }
}

function subscribeActivityStore(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(ACTIVITY_STORE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(ACTIVITY_STORE_EVENT, handler);
  };
}

export function useActivityStore() {
  const rawActivities = useSyncExternalStore(
    subscribeActivityStore,
    () => window.localStorage.getItem(ACTIVITIES_STORAGE_KEY) ?? "null",
    () => "null"
  );

  const activities: UserActivityEvent[] = useMemo(() => {
    if (rawActivities === "null") {
      return INITIAL_ACTIVITIES;
    }
    try {
      const parsed = JSON.parse(rawActivities);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return INITIAL_ACTIVITIES;
    }
  }, [rawActivities]);

  /**
   * Records an activity event with deduplication / frequency throttling:
   * If an activity with the same targetKey was recorded within the last 15 minutes,
   * updates the timestamp instead of inserting duplicate rows.
   */
  const recordActivity = useCallback(
    (event: Omit<UserActivityEvent, "id" | "timestamp"> & { timestamp?: string }) => {
      if (typeof window === "undefined") return;

      const nowIso = event.timestamp || new Date().toISOString();
      const fifteenMinMs = 15 * 60 * 1000;

      let list = activities;
      if (rawActivities === "null") {
        list = INITIAL_ACTIVITIES;
      }

      if (event.targetKey) {
        const existingIdx = list.findIndex(
          (a) =>
            a.targetKey === event.targetKey &&
            Date.now() - new Date(a.timestamp).getTime() < fifteenMinMs
        );

        if (existingIdx !== -1) {
          // Throttled: update existing timestamp without duplicating clutter
          const updated = [...list];
          updated[existingIdx] = {
            ...updated[existingIdx],
            timestamp: nowIso,
          };
          window.localStorage.setItem(
            ACTIVITIES_STORAGE_KEY,
            JSON.stringify(updated)
          );
          notifyActivityListeners();
          return;
        }
      }

      const newEvent: UserActivityEvent = {
        ...event,
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowIso,
      };

      const next = [newEvent, ...list].slice(0, 50); // keep recent 50
      window.localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(next));
      notifyActivityListeners();
    },
    [activities, rawActivities]
  );

  const clearActivities = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify([]));
    notifyActivityListeners();
  }, []);

  const removeActivity = useCallback(
    (id: string) => {
      if (typeof window === "undefined") return;
      const next = activities.filter((a) => a.id !== id);
      window.localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(next));
      notifyActivityListeners();
    },
    [activities]
  );

  return {
    activities,
    recordActivity,
    clearActivities,
    removeActivity,
  };
}

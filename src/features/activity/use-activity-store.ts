"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { UserActivityEvent } from "./types";

const ACTIVITIES_STORAGE_KEY = "cybersec_user_activities";
const ACTIVITY_STORE_EVENT = "cybersec-activity-change";

const EMPTY_ACTIVITIES: UserActivityEvent[] = [];

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
      return EMPTY_ACTIVITIES;
    }
    try {
      const parsed = JSON.parse(rawActivities);
      return Array.isArray(parsed) ? parsed : EMPTY_ACTIVITIES;
    } catch {
      return EMPTY_ACTIVITIES;
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
        list = EMPTY_ACTIVITIES;
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

"use client";

import { useSyncExternalStore } from "react";

export const PROGRESS_STORAGE_KEY = "ostrosc.progress.v2";

export type QuestionStat = {
  seen: number;
  ok: number;
  bad: number;
  lastOk: boolean;
  ts: number;
};

export type SessionRecord = {
  ts: number;
  score: number;
  total: number;
  categories: string[];
};

export type Store = {
  stats: Record<string, QuestionStat>;
  history: SessionRecord[];
};

const EMPTY: Store = { stats: {}, history: [] };

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "");
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return {
      stats: parsed.stats ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* prywatne okno albo brak miejsca — nauka działa dalej, bez zapisu */
  }
}

const listeners = new Set<() => void>();
let cache: Store | null = null;

function current(): Store {
  if (cache === null) cache = read();
  return cache;
}

function update(fn: (s: Store) => Store) {
  const next = fn(current());
  cache = next;
  write(next);
  listeners.forEach((notify) => notify());
}

function blank(): QuestionStat {
  return { seen: 0, ok: 0, bad: 0, lastOk: false, ts: 0 };
}

export function recordAnswer(id: string, correct: boolean) {
  update((s) => {
    const prev = s.stats[id] ?? blank();
    return {
      ...s,
      stats: {
        ...s.stats,
        [id]: {
          seen: prev.seen + 1,
          ok: prev.ok + (correct ? 1 : 0),
          bad: prev.bad + (correct ? 0 : 1),
          lastOk: correct,
          ts: Date.now(),
        },
      },
    };
  });
}

export function recordSession(record: Omit<SessionRecord, "ts">) {
  update((s) => ({
    ...s,
    history: [{ ...record, ts: Date.now() }, ...s.history].slice(0, 30),
  }));
}

export function resetProgress() {
  update(() => EMPTY);
}

/** Pytania, na które ostatnio padła zła odpowiedź. */
export function isWeak(stat: QuestionStat | undefined) {
  return Boolean(stat && stat.bad > 0 && !stat.lastOk);
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const onServer = () => EMPTY;
const readOnClient = () => true;
const readOnServer = () => false;

/**
 * Subscribes to the store. `ready` is false until the browser snapshot is in,
 * so nothing renders localStorage data during hydration.
 */
export function useProgress() {
  const store = useSyncExternalStore(subscribe, current, onServer);
  const ready = useSyncExternalStore(subscribe, readOnClient, readOnServer);

  return { store, ready, reset: resetProgress };
}

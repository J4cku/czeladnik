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
  level?: "czeladnik" | "mistrz";
  mode?: "practice" | "exam" | "retry" | "oral" | "flashcards";
  perCategory?: { category: string; score: number; total: number; kind: "abc" | "open" }[];
  difficultyResults?: { difficulty: "latwe" | "srednie" | "trudne"; score: number; total: number }[];
  objectiveScore?: number;
  objectiveTotal?: number;
  selfAssessedScore?: number;
  selfAssessedTotal?: number;
};

export type Store = {
  stats: Record<string, QuestionStat>;
  history: SessionRecord[];
  resetVersion?: number;
};

const EMPTY: Store = { stats: {}, history: [] };

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
}

function result(value: unknown): value is { score: number; total: number } & Record<string, unknown> {
  return object(value) && count(value.score) && count(value.total) && value.score <= value.total;
}

function session(value: unknown): SessionRecord | null {
  if (!result(value) || !timestamp(value.ts) || !Array.isArray(value.categories) ||
    !value.categories.every((category) => typeof category === "string")) return null;
  const record: SessionRecord = {
    ts: value.ts, score: value.score, total: value.total, categories: value.categories,
  };
  if (value.level === "czeladnik" || value.level === "mistrz") record.level = value.level;
  if (value.mode === "practice" || value.mode === "exam" || value.mode === "retry" ||
    value.mode === "oral" || value.mode === "flashcards") record.mode = value.mode;
  if (Array.isArray(value.perCategory) && value.perCategory.every((item) =>
    result(item) && typeof item.category === "string" && (item.kind === "abc" || item.kind === "open"))) {
    record.perCategory = value.perCategory.map(({ category, score, total, kind }) => ({ category, score, total, kind }));
  }
  if (Array.isArray(value.difficultyResults) && value.difficultyResults.every((item) =>
    result(item) && (item.difficulty === "latwe" || item.difficulty === "srednie" || item.difficulty === "trudne"))) {
    record.difficultyResults = value.difficultyResults.map(({ difficulty, score, total }) => ({ difficulty, score, total }));
  }
  if (count(value.objectiveScore) && count(value.objectiveTotal) && value.objectiveScore <= value.objectiveTotal) {
    record.objectiveScore = value.objectiveScore;
    record.objectiveTotal = value.objectiveTotal;
  }
  if (count(value.selfAssessedScore) && count(value.selfAssessedTotal) && value.selfAssessedScore <= value.selfAssessedTotal) {
    record.selfAssessedScore = value.selfAssessedScore;
    record.selfAssessedTotal = value.selfAssessedTotal;
  }
  return record;
}

function decode(raw: string | null): Store {
  try {
    const parsed: unknown = JSON.parse(raw ?? "");
    if (!object(parsed)) return EMPTY;
    const stats: Record<string, QuestionStat> = {};
    if (object(parsed.stats)) {
      for (const [id, value] of Object.entries(parsed.stats)) {
        if (object(value) && count(value.seen) && count(value.ok) && count(value.bad) &&
          value.seen === value.ok + value.bad && typeof value.lastOk === "boolean" && timestamp(value.ts)) {
          Object.defineProperty(stats, id, { value: {
            seen: value.seen, ok: value.ok, bad: value.bad, lastOk: value.lastOk, ts: value.ts,
          }, enumerable: true, configurable: true, writable: true });
        }
      }
    }
    const history = Array.isArray(parsed.history)
      ? parsed.history.map(session).filter((record): record is SessionRecord => record !== null).slice(0, 30)
      : [];
    return { stats, history, ...(count(parsed.resetVersion) ? { resetVersion: parsed.resetVersion } : {}) };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
let cache: Store | null = null;
let cacheJSON = "";
let persisted: Store = EMPTY;
let persistedRaw: string | null | undefined;
let storageError = false;
let pending: ((store: Store) => Store)[] = [];
const failedVersions = new WeakMap<(store: Store) => Store, number>();

function snapshot(next: Store) {
  const json = JSON.stringify(next);
  if (cache === null || json !== cacheJSON) {
    cache = next;
    cacheJSON = json;
  }
}

function refresh() {
  if (typeof window === "undefined") return false;
  let readable = true;
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw !== persistedRaw) {
      persisted = decode(raw);
      persistedRaw = raw;
    }
    pending = pending.filter((change) => !failedVersions.has(change) ||
      failedVersions.get(change) === (persisted.resetVersion ?? 0));
    if (pending.length === 0) storageError = false;
  } catch {
    storageError = true;
    readable = false;
  }
  snapshot(pending.reduce((store, change) => change(store), persisted));
  return readable;
}

function current(): Store {
  if (cache === null) refresh();
  return cache ?? EMPTY;
}

function failed(batch: typeof pending) {
  for (const change of batch) {
    if (!failedVersions.has(change)) failedVersions.set(change, persisted.resetVersion ?? 0);
  }
  storageError = true;
}

function commit(batch: typeof pending) {
  if (refresh()) {
    try {
      const changes = batch.filter((change) => pending.includes(change));
      const next = changes.reduce((store, change) => change(store), persisted);
      const raw = JSON.stringify(next);
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, raw);
      persisted = next;
      persistedRaw = raw;
      pending = pending.filter((change) => !changes.includes(change));
      snapshot(pending.reduce((store, change) => change(store), persisted));
      storageError = false;
    } catch {
      failed(batch);
    }
  } else {
    failed(batch);
  }
  listeners.forEach((notify) => notify());
}

function update(fn: (s: Store) => Store) {
  if (typeof window === "undefined") return;
  const before = current();
  pending.push(fn);
  snapshot(fn(before));
  const batch = [...pending];
  if (typeof navigator !== "undefined" && navigator.locks) {
    listeners.forEach((notify) => notify());
    try {
      void navigator.locks.request(PROGRESS_STORAGE_KEY, { mode: "exclusive" }, () => commit(batch))
        .catch(() => {
          failed(batch);
          listeners.forEach((notify) => notify());
        });
    } catch {
      failed(batch);
      listeners.forEach((notify) => notify());
    }
  } else {
    commit(batch);
  }
}

function blank(): QuestionStat {
  return { seen: 0, ok: 0, bad: 0, lastOk: false, ts: 0 };
}

export function recordAnswer(id: string, correct: boolean) {
  const ts = Date.now();
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
          ts,
        },
      },
    };
  });
}

export function recordSession(record: Omit<SessionRecord, "ts">) {
  const ts = Date.now();
  update((s) => ({
    ...s,
    history: [{ ...record, ts }, ...s.history].slice(0, 30),
  }));
}

export function resetProgress() {
  update((store) => ({ stats: {}, history: [], resetVersion: (store.resetVersion ?? 0) + 1 }));
}

/** Pytania, na które ostatnio padła zła odpowiedź. */
export function isWeak(stat: QuestionStat | undefined) {
  return Boolean(stat && stat.bad > 0 && !stat.lastOk);
}

function subscribe(notify: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  listeners.add(notify);
  const before = current();
  const previousError = storageError;
  refresh();
  if (current() !== before || storageError !== previousError) listeners.forEach((listener) => listener());
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== PROGRESS_STORAGE_KEY) return;
  if (event.storageArea && event.storageArea !== window.localStorage) return;
  const before = current();
  const previousError = storageError;
  refresh();
  if (current() !== before || storageError !== previousError) listeners.forEach((notify) => notify());
}

const onServer = () => EMPTY;
const readOnClient = () => true;
const readOnServer = () => false;
const readStorageError = () => storageError;

/**
 * Subscribes to the store. `ready` is false until the browser snapshot is in,
 * so nothing renders localStorage data during hydration.
 */
export function useProgress() {
  const store = useSyncExternalStore(subscribe, current, onServer);
  const ready = useSyncExternalStore(subscribe, readOnClient, readOnServer);
  const error = useSyncExternalStore(subscribe, readStorageError, readOnServer);

  return { store, ready, storageError: error, reset: resetProgress };
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const { code } = transformSync(readFileSync(new URL("../lib/progress.ts", import.meta.url), "utf8"), {
  jsc: { parser: { syntax: "typescript" } },
  module: { type: "commonjs" },
  env: { targets: { node: process.versions.node } },
});

function browser(locks) {
  const values = new Map();
  const storage = {
    blocked: false,
    writesBlocked: false,
    getItem(key) {
      if (this.blocked) throw new Error("Storage unavailable");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (this.blocked || this.writesBlocked) throw new Error("Storage unavailable");
      values.set(key, value);
    },
  };
  return {
    storage,
    tab() {
      const listeners = new Set();
      const hooks = [];
      const window = {
        localStorage: storage,
        addEventListener(type, listener) { if (type === "storage") listeners.add(listener); },
        removeEventListener(type, listener) { if (type === "storage") listeners.delete(listener); },
      };
      const testModule = { exports: {} };
      vm.runInNewContext(code, {
        module: testModule,
        exports: testModule.exports,
        window,
        navigator: locks ? { locks } : {},
        require(name) {
          assert.equal(name, "react");
          return { useSyncExternalStore(subscribe, snapshot, serverSnapshot) {
            hooks.push({ subscribe, snapshot, serverSnapshot });
            return snapshot();
          } };
        },
      });
      const api = testModule.exports;
      return {
        ...api,
        snapshot: () => api.useProgress(),
        hooks,
        dispatch(key = api.PROGRESS_STORAGE_KEY) {
          listeners.forEach((listener) => listener({ key, storageArea: storage }));
        },
      };
    },
    saved() { return JSON.parse(storage.getItem("ostrosc.progress.v2")); },
  };
}

test("sequential answers in cached tabs preserve every answer and session", () => {
  const shared = browser();
  const a = shared.tab();
  const b = shared.tab();
  a.snapshot();
  b.snapshot();
  a.recordAnswer("one", true);
  b.recordAnswer("two", false);
  b.recordSession({ score: 1, total: 2, categories: ["bhp"] });
  a.recordAnswer("three", true);
  assert.deepEqual(Object.keys(shared.saved().stats).sort(), ["one", "three", "two"]);
  assert.equal(shared.saved().history.length, 1);
  b.recordAnswer("one", false);
  assert.equal(shared.saved().stats.one.seen, 2);
  assert.equal(shared.saved().stats.one.ok, 1);
  assert.equal(shared.saved().stats.one.bad, 1);
});

test("a stale tab does not resurrect progress after another tab resets", () => {
  const shared = browser();
  const a = shared.tab();
  const b = shared.tab();
  a.recordAnswer("before", true);
  b.resetProgress();
  a.recordAnswer("after", false);
  assert.deepEqual(Object.keys(shared.saved().stats), ["after"]);
});

test("storage subscriptions refresh snapshots, ignore other keys, and unsubscribe", () => {
  const shared = browser();
  const a = shared.tab();
  const b = shared.tab();
  const before = a.snapshot().store;
  const hook = a.hooks[0];
  let notifications = 0;
  const unsubscribe = hook.subscribe(() => { notifications += 1; });
  assert.equal(hook.snapshot(), before, "unchanged snapshots retain their identity");
  b.recordAnswer("remote", true);
  a.dispatch("unrelated");
  assert.equal(notifications, 0);
  a.dispatch();
  assert.equal(notifications, 1);
  const after = hook.snapshot();
  assert.equal(after.stats.remote.ok, 1);
  assert.equal(hook.snapshot(), after);
  a.dispatch();
  assert.equal(hook.snapshot(), after);
  assert.equal(notifications, 1, "unchanged storage does not emit a new snapshot");
  b.resetProgress();
  a.dispatch(null);
  assert.equal(Object.keys(hook.snapshot().stats).length, 0);
  unsubscribe();
  b.recordAnswer("later", true);
  a.dispatch();
  assert.equal(notifications, 2);
});

test("resubscribing refreshes changes made while no consumer was mounted", () => {
  const shared = browser();
  const a = shared.tab();
  const b = shared.tab();
  a.snapshot();
  const hook = a.hooks[0];
  hook.subscribe(() => {})();
  b.recordAnswer("remote", true);
  hook.subscribe(() => {});
  assert.equal(hook.snapshot().stats.remote.ok, 1);
});

test("storage failures keep studying in memory and recover pending answers", () => {
  const shared = browser();
  const a = shared.tab();
  a.recordAnswer("saved", true);
  shared.storage.blocked = true;
  a.recordAnswer("unsaved", false);
  assert.equal(a.snapshot().storageError, true);
  assert.equal(a.snapshot().store.stats.unsaved.bad, 1);
  a.recordAnswer("unsaved", true);
  assert.equal(a.snapshot().store.stats.unsaved.seen, 2);
  shared.storage.blocked = false;
  a.recordAnswer("recovered", true);
  assert.equal(a.snapshot().storageError, false);
  assert.deepEqual(Object.keys(shared.saved().stats).sort(), ["recovered", "saved", "unsaved"]);
  assert.equal(shared.saved().stats.unsaved.seen, 2);
});

test("malformed saved stats and sessions cannot enter analytics", () => {
  const shared = browser();
  const good = { seen: 2, ok: 1, bad: 1, lastOk: false, ts: 20 };
  shared.storage.setItem("ostrosc.progress.v2", JSON.stringify({
    stats: {
      good,
      missing: {},
      negative: { ...good, bad: -1 },
      text: { ...good, seen: "2" },
      inconsistent: { ...good, seen: 99 },
      null: null,
    },
    history: [
      null,
      { ts: 1, score: 1, total: 2, categories: ["bhp"] },
      { ts: 1e100, score: 1, total: 2, categories: ["bhp"] },
      { ts: 1, score: 4, total: 2, categories: [] },
      { ts: 1, score: 1, total: 2, categories: "bhp" },
    ],
  }));
  const a = shared.tab();
  assert.deepEqual(Object.keys(a.snapshot().store.stats), ["good"]);
  assert.equal(a.snapshot().store.history.length, 1);
  a.recordAnswer("good", true);
  assert.equal(shared.saved().stats.good.seen, 3);
});

test("invalid optional session metadata is removed while valid legacy scores survive", () => {
  const shared = browser();
  shared.storage.setItem("ostrosc.progress.v2", JSON.stringify({ stats: {}, history: [{
    ts: 1, score: 1, total: 2, categories: ["bhp"],
    level: "not-a-level", mode: "anything", objectiveScore: -5,
    perCategory: [{ category: "bhp", score: "wrong", total: 2, kind: "abc" }],
  }] }));
  const history = browserHistory(shared);
  assert.equal(history.length, 1);
  assert.equal(history[0].mode, undefined);
  assert.equal(history[0].level, undefined);
  assert.equal(history[0].objectiveScore, undefined);
  assert.equal(history[0].perCategory, undefined);
});

function browserHistory(shared) { return shared.tab().snapshot().store.history; }

function lockManager() {
  let tail = Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  return {
    request(name, options, callback) {
      assert.equal(name, "ostrosc.progress.v2");
      assert.equal(options.mode, "exclusive");
      const task = tail.then(async () => { await gate; return callback({ name, mode: "exclusive" }); });
      tail = task.catch(() => {});
      return task;
    },
    release,
    async drain() { await tail; },
  };
}

test("contending documents keep optimistic answers and persist all increments inside the lock", async () => {
  const locks = lockManager();
  const shared = browser(locks);
  const a = shared.tab();
  const b = shared.tab();
  a.snapshot();
  b.snapshot();
  a.recordAnswer("same", true);
  b.recordAnswer("same", false);
  a.recordSession({ score: 1, total: 2, categories: ["bhp"], level: "mistrz", mode: "exam" });
  assert.equal(a.snapshot().store.stats.same.ok, 1);
  assert.equal(b.snapshot().store.stats.same.bad, 1);
  assert.equal(shared.saved(), null, "persistence waits for the exclusive lock");
  locks.release();
  await locks.drain();
  assert.equal(shared.saved().stats.same.seen, 2);
  assert.equal(shared.saved().stats.same.ok, 1);
  assert.equal(shared.saved().stats.same.bad, 1);
  assert.equal(shared.saved().history[0].level, "mistrz");
  assert.equal(shared.saved().history[0].mode, "exam");
});

test("queued answer-reset-answer commits cannot resurrect pre-reset snapshots", async () => {
  const locks = lockManager();
  const shared = browser(locks);
  const a = shared.tab();
  const b = shared.tab();
  a.recordAnswer("before", true);
  b.resetProgress();
  a.recordAnswer("after", false);
  assert.deepEqual(Object.keys(b.snapshot().store.stats), []);
  locks.release();
  await locks.drain();
  assert.deepEqual(Object.keys(shared.saved().stats), ["after"]);
});

test("lock commits recover failed writes without repeating successfully committed answers", async () => {
  const locks = lockManager();
  const shared = browser(locks);
  const a = shared.tab();
  shared.storage.writesBlocked = true;
  a.recordAnswer("unsaved", false);
  locks.release();
  await locks.drain();
  assert.equal(a.snapshot().storageError, true);
  assert.equal(a.snapshot().store.stats.unsaved.seen, 1);
  shared.storage.writesBlocked = false;
  a.recordAnswer("new", true);
  await locks.drain();
  assert.equal(a.snapshot().storageError, false);
  assert.equal(shared.saved().stats.unsaved.seen, 1);
  assert.equal(shared.saved().stats.new.seen, 1);
  a.recordAnswer("new", false);
  await locks.drain();
  assert.equal(shared.saved().stats.unsaved.seen, 1);
  assert.equal(shared.saved().stats.new.seen, 2);
});

test("a remote reset discards older failed answers before a tab retries persistence", async () => {
  const locks = lockManager();
  const shared = browser(locks);
  const a = shared.tab();
  const b = shared.tab();
  shared.storage.writesBlocked = true;
  a.recordAnswer("before-reset", false);
  locks.release();
  await locks.drain();
  shared.storage.writesBlocked = false;
  b.resetProgress();
  await locks.drain();
  a.recordAnswer("after-reset", true);
  await locks.drain();
  assert.deepEqual(Object.keys(shared.saved().stats), ["after-reset"]);
});

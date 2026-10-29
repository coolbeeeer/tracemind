import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  locked: false,
  checkpoint: null as string | null,
  unlocks: 0,
  writes: 0,
}));
vi.mock("postgres", () => ({
  default: () => {
    const sql = Object.assign(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const statement = strings.join("?");
        if (statement.includes("pg_try_advisory_lock")) {
          if (state.locked) return [{ acquired: false }];
          state.locked = true;
          return [{ acquired: true }];
        }
        if (statement.includes("pg_advisory_unlock")) {
          state.locked = false;
          state.unlocks++;
          return [{ pg_advisory_unlock: true }];
        }
        if (statement.includes("select last_successful_at")) {
          return state.checkpoint ? [{ last_successful_at: state.checkpoint }] : [];
        }
        if (statement.includes("insert into tracemind_poll_checkpoints")) {
          state.writes++;
          state.checkpoint = values[3] as string;
          return [];
        }
        throw new Error("Unexpected SQL");
      },
      { end: async () => {} },
    );
    return sql;
  },
}));

import { withMonitoringCheckpoint } from "./poll-checkpoint.js";

const target = { projectId: "example-project", serviceName: "payments", region: "asia-south2" };
const now = new Date("2026-10-29T10:00:00.000Z");

describe("monitoring checkpoint recovery and concurrency", () => {
  it("does not advance checkpoint on failure, and retries the same window", async () => {
    state.locked = false; state.checkpoint = null; state.writes = 0;
    const windows: string[] = [];
    await expect(withMonitoringCheckpoint("postgres://unused", target, async since => {
      windows.push(since);
      throw new Error("collector failed");
    }, now)).rejects.toThrow("collector failed");
    expect(state.writes).toBe(0);
    const result = await withMonitoringCheckpoint("postgres://unused", target, async since => {
      windows.push(since);
      return 1;
    }, now);
    expect(result.skipped).toBe(false);
    expect(windows).toEqual(["2026-10-29T09:55:00.000Z", "2026-10-29T09:55:00.000Z"]);
    expect(state.writes).toBe(1);
  });

  it("skips a concurrent worker without running its poll callback", async () => {
    state.locked = false; state.checkpoint = null; state.writes = 0;
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const first = withMonitoringCheckpoint("postgres://unused", target, async () => {
      started();
      await waiting;
      return 1;
    }, now);
    await entered;
    const secondPoll = vi.fn(async () => 2);
    const second = await withMonitoringCheckpoint("postgres://unused", target, secondPoll, now);
    expect(second.skipped).toBe(true);
    expect(secondPoll).not.toHaveBeenCalled();
    release();
    expect((await first).skipped).toBe(false);
    expect(state.writes).toBe(1);
  });

  it("replays a one-minute overlap after successful checkpoint", async () => {
    state.locked = false; state.checkpoint = "2026-10-29T09:58:00.000Z";
    let since = "";
    await withMonitoringCheckpoint("postgres://unused", target, async cursor => {
      since = cursor;
      return 1;
    }, now);
    expect(since).toBe("2026-10-29T09:57:00.000Z");
  });
});

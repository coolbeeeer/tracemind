import { describe, expect, it, vi } from "vitest";
import { fetchDbTableLogs, type DbLogExecutor } from "./db-table-log-reader.js";

const base = {
  table: "public.app_logs",
  serviceId: "api",
  timestampColumn: "created_at",
  messageColumn: "message",
  since: "2026-10-30T00:00:00.000Z",
};

describe("database table log reader", () => {
  it("maps rows to monitoring events using the level column", async () => {
    const rows = [
      { created_at: "2026-10-30T12:00:00.000Z", message: "boom", level: "ERROR" },
      { created_at: new Date("2026-10-30T12:01:00.000Z"), message: "slow query", level: "WARN" },
    ];
    let seenSql = "";
    const execute: DbLogExecutor = {
      query: async (text) => {
        seenSql = text;
        return rows;
      },
    };
    const events = await fetchDbTableLogs(
      { ...base, levelColumn: "level" },
      execute,
    );
    expect(events).toHaveLength(2);
    expect(events[0]?.severity).toBe("ERROR");
    expect(events[1]?.severity).toBe("WARNING");
    expect(seenSql).toContain("FROM public.app_logs");
    expect(seenSql).toContain("LIMIT 251");
  });

  it("falls back to message text without a level column", async () => {
    const execute = {
      query: vi.fn(async () => [
        { created_at: "2026-10-30T12:00:00.000Z", message: "ERROR: disk full" },
      ]),
    };
    const events = await fetchDbTableLogs(base, execute);
    expect(events[0]?.severity).toBe("ERROR");
  });

  it("rejects non-identifier table and column names instead of interpolating them", async () => {
    const execute = { query: vi.fn(async () => []) };
    await expect(
      fetchDbTableLogs({ ...base, table: "app_logs; DROP TABLE app_logs" }, execute),
    ).rejects.toThrow(/Invalid table/);
    await expect(
      fetchDbTableLogs({ ...base, table: "a.b.c" }, execute),
    ).rejects.toThrow(/Invalid table/);
    await expect(
      fetchDbTableLogs({ ...base, messageColumn: "message OR 1=1" }, execute),
    ).rejects.toThrow(/Invalid messageColumn/);
    expect(execute.query).not.toHaveBeenCalled();
  });

  it("throws when more rows remain than the limit", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      created_at: `2026-10-30T12:0${i}:00.000Z`,
      message: `ERROR: failure ${i}`,
    }));
    const execute = { query: vi.fn(async () => rows) };
    await expect(
      fetchDbTableLogs({ ...base, limit: 2 }, execute),
    ).rejects.toThrow(/truncated/);
  });
});

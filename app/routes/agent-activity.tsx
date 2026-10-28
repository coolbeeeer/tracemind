import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { DemoBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import { StepStatusBadge } from "@/components/tracemind/investigation-bits";
import { formatDateTime } from "@/lib/tracemind/format";
import type { AgentActionStatus } from "../../shared/tracemind/models.js";

export function meta() {
  return [{ title: "Agent Activity — TraceMind" }];
}

const inputClass =
  "rounded-lg border border-[#1E2430] bg-[#0A0C10] px-3 py-2 text-sm text-[#E6EAF2] outline-none focus:border-[#10B981]";

interface ActivityEvent {
  id: string;
  investigationId: string;
  incidentId: string;
  kind: "investigation-started" | "tool";
  tool: string;
  input: string;
  output?: string | undefined;
  status: AgentActionStatus;
  startedAt: string;
  completedAt?: string | undefined;
}

export default function AgentActivityRoute() {
  const investigationsQuery = useActionQuery("list-investigations", {});
  const incidentsQuery = useActionQuery("list-incidents", {});
  const investigations = investigationsQuery.data?.investigations ?? [];
  const incidents = incidentsQuery.data?.incidents ?? [];

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [tool, setTool] = useState("all");
  const [investigationFilter, setInvestigationFilter] = useState("all");

  const events = useMemo<ActivityEvent[]>(() => {
    const out: ActivityEvent[] = [];
    for (const investigation of investigations) {
      out.push({
        id: `${investigation.id}-started`,
        investigationId: investigation.id,
        incidentId: investigation.incidentId,
        kind: "investigation-started",
        tool: "investigation-started",
        input: `Investigation ${investigation.id} for ${investigation.incidentId}`,
        status: investigation.status === "running"
          ? "running"
          : investigation.status === "completed"
            ? "completed"
            : investigation.status === "failed"
              ? "failed"
              : "pending",
        startedAt: investigation.startedAt,
        completedAt: investigation.completedAt,
      });
      for (const step of investigation.steps) {
        out.push({
          id: step.id,
          investigationId: investigation.id,
          incidentId: investigation.incidentId,
          kind: "tool",
          tool: step.tool,
          input: step.input,
          output: step.output,
          status: step.status,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        });
      }
    }
    return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [investigations]);

  const tools = useMemo(
    () => [...new Set(events.filter((e) => e.kind === "tool").map((e) => e.tool))],
    [events],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (tool !== "all" && event.tool !== tool) return false;
      if (
        investigationFilter !== "all" &&
        event.investigationId !== investigationFilter
      ) {
        return false;
      }
      if (q) {
        const haystack =
          `${event.tool} ${event.input} ${event.output ?? ""} ${event.investigationId} ${event.incidentId}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, status, tool, investigationFilter]);

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setTool("all");
    setInvestigationFilter("all");
  };

  const loading = investigationsQuery.isPending || incidentsQuery.isPending;
  const error = investigationsQuery.error ?? incidentsQuery.error;
  const incidentDetectedAt = (incidentId: string) =>
    incidents.find((i) => i.id === incidentId)?.detectedAt;

  return (
    <main className="min-h-full bg-[#0A0C10] text-[#E6EAF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
              Agent Activity
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agent Activity
            </h1>
            <p className="mt-1 text-sm text-[#8B94A7]">
              Investigation runs and tool executions from the demo dataset.
              These are synthetic records, not live agent runs, and any
              future live runs will appear here in the same shape.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load activity. Please try again."}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#11141B] h-64" aria-label="Loading" />
        ) : (
          <section className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tool, input, or output"
                aria-label="Search activity"
                className={`${inputClass} min-w-[220px] flex-1`}
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
                className={inputClass}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={tool}
                onChange={(event) => setTool(event.target.value)}
                aria-label="Filter by tool"
                className={inputClass}
              >
                <option value="all">All tools</option>
                {tools.map((toolName) => (
                  <option key={toolName} value={toolName}>{toolName}</option>
                ))}
              </select>
              <select
                value={investigationFilter}
                onChange={(event) => setInvestigationFilter(event.target.value)}
                aria-label="Filter by investigation"
                className={inputClass}
              >
                <option value="all">All investigations</option>
                {investigations.map((investigation) => (
                  <option key={investigation.id} value={investigation.id}>
                    {investigation.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-[#1E2430] px-3 py-2 text-sm text-[#8B94A7] hover:text-[#E6EAF2]"
              >
                Clear filters
              </button>
            </div>

            <p className="mt-3 text-xs text-[#8B94A7]">
              Showing {filtered.length} of {events.length} activity events.
            </p>

            {events.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#1E2430] px-4 py-6 text-center">
                <p className="text-sm">No investigation activity yet.</p>
                <p className="mt-1 text-xs text-[#8B94A7]">
                  Activity will appear here once a real investigation runs;
                  nothing is fabricated to fill this empty state.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#1E2430] px-4 py-6 text-center">
                <p className="text-sm">No activity matches these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981]"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                {filtered.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-[#1E2430] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{event.tool}</span>
                      <StepStatusBadge status={event.status} />
                      <span className="text-xs text-[#8B94A7]">
                        {formatDateTime(event.startedAt)}
                        {event.completedAt
                          ? ` → ${formatDateTime(event.completedAt)}`
                          : ""}
                      </span>
                      <Link
                        to={`/investigations/${event.investigationId}`}
                        className="text-xs text-[#10B981] hover:underline"
                      >
                        {event.investigationId} →
                      </Link>
                      {incidentDetectedAt(event.incidentId) ? (
                        <span className="text-xs text-[#8B94A7]">
                          Incident detected {formatDateTime(incidentDetectedAt(event.incidentId) ?? "")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[#8B94A7]">{event.input}</p>
                    {event.output ? (
                      <p className="mt-1 rounded-lg bg-white/5 px-3 py-2 text-sm">
                        {event.output}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

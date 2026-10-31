import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { DemoBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import { Panel, redesign } from "@/components/tracemind/redesign";
import { formatDateTime } from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Logs — TraceMind" }];
}

const levelStyles: Record<string, string> = {
  error: "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#F87171]",
  warn: "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FBBF24]",
  info: "border-[#5B8DEF]/30 bg-[#5B8DEF]/10 text-[#8AACF4]",
};

const inputStyle = {
  borderColor: redesign.border,
  backgroundColor: redesign.pageBg,
  color: redesign.text,
} as const;

type LevelFilter = "all" | "error" | "warn" | "info";

/**
 * Standalone Logs screen, frontend-only. The list-logs action
 * requires an incident, so this page selects an incident first
 * (defaulting to the first incident returned) and shows that
 * incident's logs. Search, level, and service filters run
 * client-side over the returned logs; no new backend action was
 * added for this screen.
 */
export default function LogsRoute() {
  const incidentsQuery = useActionQuery("list-incidents", {});
  const servicesQuery = useActionQuery("list-services", {});
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [serviceId, setServiceId] = useState<string>("all");

  const incidents = incidentsQuery.data?.incidents ?? [];
  const services = servicesQuery.data?.services ?? [];
  const selectedIncidentId = incidentId ?? incidents[0]?.id ?? "";
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) ?? null;

  const logsQuery = useActionQuery(
    "list-logs",
    { incidentId: selectedIncidentId },
    { enabled: selectedIncidentId !== "" },
  );
  const logs = logsQuery.data?.logs ?? [];
  const isDemo = logsQuery.data?.demo ?? true;

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (level !== "all" && log.level !== level) return false;
      if (serviceId !== "all" && log.serviceId !== serviceId) return false;
      if (!query) return true;
      return `${log.message} ${log.traceId ?? ""} ${log.serviceId}`
        .toLowerCase()
        .includes(query);
    });
  }, [logs, search, level, serviceId]);

  const serviceName = (id: string) =>
    services.find((s) => s.id === id)?.name ?? id;

  const loading = incidentsQuery.isPending || logsQuery.isPending;
  const error = incidentsQuery.error ?? servicesQuery.error ?? logsQuery.error;

  return (
    <main
      className="min-h-full"
      style={{ backgroundColor: redesign.pageBg, color: redesign.text }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Logs</h1>
            <p className="mt-1 text-sm text-[#969CA9]">
              Log entries for one incident at a time. Pick an incident, then
              search and filter its logs.
            </p>
          </div>
          {selectedIncidentId !== "" ? (isDemo ? <DemoBadge /> : null) : null}
        </div>

        <div className="mt-4">
          {selectedIncidentId !== "" && isDemo ? <DemoBanner /> : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ?? "Could not load logs. Please try again."}
          </div>
        ) : null}

        {loading ? (
          <div
            className="mt-5 h-64 animate-pulse rounded-xl"
            style={{ backgroundColor: redesign.panelBg }}
            aria-label="Loading"
          />
        ) : incidents.length === 0 ? (
          <Panel label="No incidents" className="mt-5">
            <p className="text-sm text-[#969CA9]">
              No incidents exist yet, so there are no logs to show.{" "}
              <Link to="/incidents" className="text-[#8AACF4] hover:underline">
                View incidents
              </Link>
            </p>
          </Panel>
        ) : (
          <Panel label="Logs" className="mt-5">
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-[#969CA9]">
                Incident
                <select
                  value={selectedIncidentId}
                  onChange={(event) => setIncidentId(event.target.value)}
                  aria-label="Select incident"
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#5B8DEF]"
                  style={inputStyle}
                >
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.id} · {incident.title}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search logs…"
                aria-label="Search logs"
                className="min-w-[200px] flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#5B8DEF]"
                style={inputStyle}
              />
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as LevelFilter)}
                aria-label="Filter by level"
                className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#5B8DEF]"
                style={inputStyle}
              >
                <option value="all">All levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
              </select>
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                aria-label="Filter by service"
                className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#5B8DEF]"
                style={inputStyle}
              >
                <option value="all">All services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-xs text-[#969CA9]">
              Showing {filteredLogs.length} of {logs.length} log entries
              {selectedIncident ? ` for ${selectedIncident.id}` : ""}.
            </p>

            <ul className="mt-3 divide-y divide-[#232833]">
              {filteredLogs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-[#969CA9]">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase ${levelStyles[log.level] ?? ""}`}
                    >
                      {log.level}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm break-words" title={log.message}>{log.message}</span>
                    <span className="block text-xs break-all text-[#969CA9]">
                      {serviceName(log.serviceId)}
                      {log.traceId ? ` · trace ${log.traceId}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {filteredLogs.length === 0 ? (
              <p className="mt-4 text-sm text-[#969CA9]">
                No log entries match these filters.
              </p>
            ) : null}
          </Panel>
        )}
      </div>
    </main>
  );
}

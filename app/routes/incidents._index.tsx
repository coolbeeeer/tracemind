import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import { Link } from "react-router";

import { DemoBadge, SeverityBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import { formatDateTime } from "@/lib/tracemind/format";
import type { Severity } from "../../shared/tracemind/models.js";

export function meta() {
  return [{ title: "Incidents — TraceMind" }];
}

const inputClass =
  "rounded-lg border border-[#1E2A44] bg-[#070B16] px-3 py-2 text-sm text-[#E8EDF7] outline-none focus:border-[#3B82F6]";

type SeverityFilter = "all" | Severity;
type StatusFilter = "all" | "open" | "investigating" | "resolved";

export default function IncidentsRoute() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const incidentsQuery = useActionQuery("list-incidents", {
    ...(severity !== "all" ? { severity } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(query.trim() ? { query: query.trim() } : {}),
  });
  const servicesQuery = useActionQuery("list-services", {});

  const incidents = incidentsQuery.data?.incidents ?? [];
  // The list action returns demo:true for the labelled demo dataset and
  // demo:false for real database rows. The banner must follow that flag,
  // not assume demo mode, now that the action can serve live data.
  const isDemo = incidentsQuery.data?.demo ?? true;
  const services = servicesQuery.data?.services ?? [];
  const serviceName = (serviceId: string) =>
    services.find((s) => s.id === serviceId)?.name ?? serviceId;

  const clearFilters = () => {
    setQuery("");
    setSeverity("all");
    setStatus("all");
  };

  return (
    <main className="min-h-full bg-[#070B16] text-[#E8EDF7]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#60A5FA]">
              Incidents
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Incidents
            </h1>
            <p className="mt-1 text-sm text-[#8B96B0]">
              Searchable, filterable incident list. Select an incident for its
              detail view.
            </p>
          </div>
          {isDemo ? (
            <DemoBadge />
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-medium text-[#34D399]">
              Live
            </span>
          )}
        </div>

        <div className="mt-5">
          {isDemo ? (
            <DemoBanner />
          ) : (
            <div className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#34D399]">
              Live data: these incidents come from the configured database,
              not the demo dataset. Service names on this page are still
              demo-backed until the service action is wired to live data.
            </div>
          )}
        </div>

        {incidentsQuery.error ?? servicesQuery.error ? (
          <div className="mt-5 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(incidentsQuery.error ?? servicesQuery.error) ??
              "Could not load incidents. Please try again."}
          </div>
        ) : null}

        {incidentsQuery.isPending ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#0E1526] h-64" aria-label="Loading" />
        ) : (
          <section className="mt-6 rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by id, title, or description"
                aria-label="Search incidents"
                className={`${inputClass} min-w-[220px] flex-1`}
              />
              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value as SeverityFilter)
                }
                aria-label="Filter by severity"
                className={inputClass}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                aria-label="Filter by status"
                className={inputClass}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-[#1E2A44] px-3 py-2 text-sm text-[#8B96B0] hover:text-[#E8EDF7]"
              >
                Clear filters
              </button>
            </div>

            <p className="mt-3 text-xs text-[#8B96B0]">
              Showing {incidents.length} incident{incidents.length === 1 ? "" : "s"}.
            </p>

            <ul className="mt-3 space-y-3 sm:hidden">
              {incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="rounded-2xl border border-[#1E2A44] bg-[#070B16] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <span className="text-xs capitalize text-[#8B96B0]">{incident.status}</span>
                  </div>
                  <Link
                    to={`/incidents/${incident.id}`}
                    className="mt-2 block text-sm font-medium hover:text-[#60A5FA]"
                  >
                    {incident.title}
                  </Link>
                  <p className="mt-1 text-xs text-[#8B96B0]">
                    <span className="font-mono">{incident.id}</span> ·{" "}
                    {serviceName(incident.serviceId)} · {formatDateTime(incident.detectedAt)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-3 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-[#8B96B0]">
                    <th className="py-2 pr-3 font-medium">Incident</th>
                    <th className="py-2 pr-3 font-medium">Severity</th>
                    <th className="py-2 pr-3 font-medium">Service</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Investigation</th>
                    <th className="py-2 font-medium">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="border-t border-[#1E2A44]">
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="font-medium hover:text-[#60A5FA]"
                        >
                          <span className="mr-2 font-mono text-xs text-[#8B96B0]">
                            {incident.id}
                          </span>
                          {incident.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/services/${incident.serviceId}`}
                          className="hover:text-[#60A5FA]"
                        >
                          {serviceName(incident.serviceId)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 capitalize">{incident.status}</td>
                      <td className="py-2.5 pr-3">{incident.investigationStatus}</td>
                      <td className="py-2.5 text-[#8B96B0]">
                        {formatDateTime(incident.detectedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {incidents.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#1E2A44] px-4 py-6 text-center">
                <p className="text-sm">No incidents match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-2 text-sm text-[#60A5FA]"
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

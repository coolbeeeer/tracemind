import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { DemoBadge, StatusDot } from "@/components/tracemind/badges";
import {
  DemoBanner,
  StatCard,
} from "@/components/tracemind/dashboard-bits";
import {
  formatDateTime,
  providerLabel,
} from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Services — TraceMind" }];
}

const inputClass =
  "rounded-lg border border-[#1E2A44] bg-[#070B16] px-3 py-2 text-sm text-[#E8EDF7] outline-none focus:border-[#10B981]";

export default function ServicesRoute() {
  const servicesQuery = useActionQuery("list-services", {});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [monitoring, setMonitoring] = useState("all");

  const services = servicesQuery.data?.services ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      if (status !== "all" && service.status !== status) return false;
      if (provider !== "all" && service.provider !== provider) return false;
      if (monitoring === "enabled" && !service.monitoringEnabled) return false;
      if (monitoring === "disabled" && service.monitoringEnabled) return false;
      if (q && !service.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, query, status, provider, monitoring]);

  const stats = useMemo(() => {
    const healthy = services.filter((s) => s.status === "healthy").length;
    const unhealthy = services.filter(
      (s) => s.status === "degraded" || s.status === "down",
    ).length;
    const disabled = services.filter((s) => !s.monitoringEnabled).length;
    return { total: services.length, healthy, unhealthy, disabled };
  }, [services]);

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setProvider("all");
    setMonitoring("all");
  };

  return (
    <main className="min-h-full bg-[#070B16] text-[#E8EDF7]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
              Services
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Connected services
            </h1>
            <p className="mt-1 text-sm text-[#8B96B0]">
              Health, provider, error count, and monitoring status. Select a
              service for its detail view and monitoring history.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {servicesQuery.error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(servicesQuery.error) ??
              "Could not load services. Please try again."}
          </div>
        ) : null}

        {servicesQuery.isPending ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#0E1526] h-64" aria-label="Loading" />
        ) : (
          <>
            <section
              aria-label="Service summary"
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <StatCard
                label="Connected services"
                value={String(stats.total)}
                sub={`${stats.healthy} healthy · ${stats.unhealthy} unhealthy`}
              />
              <StatCard
                label="Healthy"
                value={String(stats.healthy)}
                accent="#10B981"
                sub={`of ${stats.total} connected`}
              />
              <StatCard label="Unhealthy" value={String(stats.unhealthy)} accent="#EF4444" sub="Degraded + down" />
              <StatCard
                label="Monitoring disabled"
                value={String(stats.disabled)}
                accent="#F59E0B"
                sub="No health checks running"
              />
            </section>

            <section className="mt-6 rounded-xl border border-[#1E2A44] bg-[#0E1526] p-4">
              <div className="flex flex-wrap gap-3">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search services by name"
                  aria-label="Search services by name"
                  className={`${inputClass} min-w-[220px] flex-1`}
                />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  aria-label="Filter by status"
                  className={inputClass}
                >
                  <option value="all">All statuses</option>
                  <option value="healthy">Healthy</option>
                  <option value="degraded">Degraded</option>
                  <option value="down">Down</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  aria-label="Filter by provider"
                  className={inputClass}
                >
                  <option value="all">All providers</option>
                  <option value="gcp-run">Google Cloud Run</option>
                  <option value="github">GitHub</option>
                  <option value="aws">AWS</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={monitoring}
                  onChange={(event) => setMonitoring(event.target.value)}
                  aria-label="Filter by monitoring"
                  className={inputClass}
                >
                  <option value="all">Monitoring: any</option>
                  <option value="enabled">Monitoring enabled</option>
                  <option value="disabled">Monitoring disabled</option>
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
                Showing {filtered.length} of {services.length} services.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-[#8B96B0]">
                      <th className="py-2 pr-3 font-medium">Service</th>
                      <th className="py-2 pr-3 font-medium">Provider</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Errors</th>
                      <th className="py-2 pr-3 font-medium">Monitoring</th>
                      <th className="py-2 font-medium">Last checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((service) => (
                      <tr key={service.id} className="border-t border-[#1E2A44]">
                        <td className="py-2.5 pr-3">
                          <Link
                            to={`/services/${service.id}`}
                            className="flex items-center gap-2 font-medium hover:text-[#10B981]"
                          >
                            <StatusDot status={service.status} />
                            {service.name}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-[#8B96B0]">
                          {providerLabel(service.provider)}
                        </td>
                        <td className="py-2.5 pr-3 capitalize">{service.status}</td>
                        <td className="py-2.5 pr-3">{service.errorCount}</td>
                        <td className="py-2.5 pr-3">
                          {service.monitoringEnabled ? "Enabled" : "Disabled"}
                        </td>
                        <td className="py-2.5 text-[#8B96B0]">
                          {formatDateTime(service.lastCheckedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 ? (
                <div className="mt-4 rounded-xl border border-[#1E2A44] px-4 py-6 text-center">
                  <p className="text-sm">No services match these filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

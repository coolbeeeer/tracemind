import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useMemo } from "react";
import { Link } from "react-router";

import { DemoBadge, SeverityBadge, StatusDot } from "@/components/tracemind/badges";
import {
  DemoBanner,
  Sparkline,
  StatCard,
} from "@/components/tracemind/dashboard-bits";
import {
  formatDateTime,
  formatTime,
  providerLabel,
} from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Overview — TraceMind" }];
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-label="Loading"
      className={`animate-pulse rounded-xl bg-[#11141B] ${className}`}
    />
  );
}

export default function OverviewRoute() {
  const servicesQuery = useActionQuery("list-services", {});
  const incidentsQuery = useActionQuery("list-incidents", {});
  const healthQuery = useActionQuery("get-service-health", {
    serviceId: "svc-payments-api",
  });
  const investigationsQuery = useActionQuery("list-investigations", {});
  const deploymentsQuery = useActionQuery("list-deployments", {});

  const services = servicesQuery.data?.services ?? [];
  const incidents = incidentsQuery.data?.incidents ?? [];
  const health = healthQuery.data?.health ?? [];
  const investigations = investigationsQuery.data?.investigations ?? [];
  const deployments = deploymentsQuery.data?.deployments ?? [];

  const stats = useMemo(() => {
    const healthy = services.filter((s) => s.status === "healthy").length;
    const unhealthy = services.filter(
      (s) => s.status === "degraded" || s.status === "down",
    ).length;
    const active = incidents.filter(
      (i) => i.status === "open" || i.status === "investigating",
    ).length;
    const errors = services.reduce((sum, s) => sum + s.errorCount, 0);
    return { total: services.length, healthy, unhealthy, active, errors };
  }, [services, incidents]);

  const loading =
    servicesQuery.isPending ||
    incidentsQuery.isPending ||
    healthQuery.isPending ||
    investigationsQuery.isPending ||
    deploymentsQuery.isPending;

  const error =
    servicesQuery.error ??
    incidentsQuery.error ??
    healthQuery.error ??
    investigationsQuery.error ??
    deploymentsQuery.error;

  const serviceName = (serviceId: string) =>
    services.find((s) => s.id === serviceId)?.name ?? serviceId;

  return (
    <main className="min-h-full bg-[#0A0C10] text-[#E6EAF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
              Overview
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Your AI engineer that never stops watching.
            </h1>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load the demo overview. Please try again."}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            <section
              aria-label="Service summary"
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <StatCard label="Connected services" value={String(stats.total)} sub="Demo dataset, 6 services" />
              <StatCard label="Healthy" value={String(stats.healthy)} accent="#10B981" />
              <StatCard label="Unhealthy" value={String(stats.unhealthy)} accent="#EF4444" sub="Degraded + down" />
              <StatCard label="Active incidents" value={String(stats.active)} accent="#F59E0B" />
              <StatCard label="Errors in window" value={String(stats.errors)} sub="Sum across services" />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4 lg:col-span-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold">
                    Error rate — payments-api <DemoBadge />
                  </h2>
                  <span className="text-xs text-[#8B94A7]">
                    Demo health points, last 30 minutes
                  </span>
                </div>
                <div className="mt-3">
                  <Sparkline
                    values={health.map((point) => point.errorRate)}
                    stroke="#EF4444"
                    label="Error rate trend for payments-api"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#8B94A7]">
                  {health.map((point) => (
                    <span key={point.timestamp}>
                      {formatTime(point.timestamp)}: {point.errorRate.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
                <h2 className="text-sm font-semibold">
                  AI investigation activity <DemoBadge />
                </h2>
                <p className="mt-1 text-xs text-[#8B94A7]">
                  Synthetic activity only. No agent has investigated anything
                  yet in Phase 1.
                </p>
                <ul className="mt-4 space-y-3">
                  {investigations.map((investigation) => (
                    <li key={investigation.id} className="text-sm">
                      <p className="font-medium">
                        {investigation.incidentId} · {investigation.status}
                      </p>
                      <p className="text-xs text-[#8B94A7]">
                        {investigation.steps.length} demo steps · started{" "}
                        {formatDateTime(investigation.startedAt)}
                      </p>
                      {investigation.hypotheses.map((hypothesis) => (
                        <p key={hypothesis.id} className="mt-1 text-xs text-[#E6EAF2]">
                          {hypothesis.title} ({hypothesis.confidence}%)
                        </p>
                      ))}
                    </li>
                  ))}
                  {investigations.length === 0 ? (
                    <li className="text-sm text-[#8B94A7]">
                      No demo investigations yet.
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4 lg:col-span-2">
                <h2 className="text-sm font-semibold">Service health</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-[#8B94A7]">
                        <th className="py-2 pr-3 font-medium">Service</th>
                        <th className="py-2 pr-3 font-medium">Provider</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Errors</th>
                        <th className="py-2 font-medium">Last checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => (
                        <tr key={service.id} className="border-t border-[#1E2430]">
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              <StatusDot status={service.status} />
                              {service.name}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-[#8B94A7]">
                            {providerLabel(service.provider)}
                          </td>
                          <td className="py-2.5 pr-3 capitalize">{service.status}</td>
                          <td className="py-2.5 pr-3">{service.errorCount}</td>
                          <td className="py-2.5 text-[#8B94A7]">
                            {formatDateTime(service.lastCheckedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
                <h2 className="text-sm font-semibold">Recent deployments</h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {deployments.map((deployment) => (
                    <li key={deployment.id} className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-medium">{serviceName(deployment.serviceId)}</span>{" "}
                        <span className="font-mono text-xs text-[#8B94A7]">{deployment.version}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#8B94A7]">
                        {formatDateTime(deployment.deployedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
              <h2 className="text-sm font-semibold">
                Recent incidents <DemoBadge />
              </h2>
              <ul className="mt-3 divide-y divide-[#1E2430]">
                {incidents.map((incident) => (
                  <li key={incident.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <SeverityBadge severity={incident.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        <span className="font-mono text-xs text-[#8B94A7]">{incident.id}</span>{" "}
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="hover:text-[#10B981]"
                        >
                          {incident.title}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-[#8B94A7]">
                        {serviceName(incident.serviceId)} · {incident.status} · investigation{" "}
                        {incident.investigationStatus} · {formatDateTime(incident.detectedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[#8B94A7]">
                Select an incident for its detail view, or open the full
                searchable list on the Incidents page.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

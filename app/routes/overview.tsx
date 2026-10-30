import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { DemoBadge, SeverityBadge, StatusDot } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import {
  BarChart,
  DonutChart,
  Panel,
  PanelTitle,
  StatCard,
  redesign,
} from "@/components/tracemind/redesign";
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
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ backgroundColor: redesign.panelBg }}
    />
  );
}

const inputStyle = {
  borderColor: redesign.border,
  backgroundColor: redesign.pageBg,
  color: redesign.text,
} as const;

export default function OverviewRoute() {
  const servicesQuery = useActionQuery("list-services", {});
  const incidentsQuery = useActionQuery("list-incidents", {});
  const healthQuery = useActionQuery("get-service-health", {
    serviceId: "svc-payments-api",
  });
  const investigationsQuery = useActionQuery("list-investigations", {});
  const deploymentsQuery = useActionQuery("list-deployments", {});

  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "all">("24h");

  const services = servicesQuery.data?.services ?? [];
  const allIncidents = incidentsQuery.data?.incidents ?? [];
  // Incidents can go live while services, health, deployments, and
  // investigations stay demo-backed, so the page badge and banner
  // must follow the incidents action's own demo flag, not assume
  // the whole page is synthetic.
  const incidentsAreDemo = incidentsQuery.data?.demo ?? true;
  const health = healthQuery.data?.health ?? [];
  const investigations = investigationsQuery.data?.investigations ?? [];
  const deployments = deploymentsQuery.data?.deployments ?? [];

  // The time filter applies to incident-derived sections only. Health
  // points are the demo 30-minute series and services are current
  // state, so neither is filtered by it. Unparseable timestamps are
  // kept visible rather than silently dropped.
  const incidents = useMemo(() => {
    if (timeRange === "all") return allIncidents;
    const windowMs = timeRange === "24h" ? 24 * 3600_000 : 7 * 24 * 3600_000;
    const cutoff = Date.now() - windowMs;
    return allIncidents.filter((incident) => {
      const time = Date.parse(incident.detectedAt);
      return Number.isNaN(time) || time >= cutoff;
    });
  }, [allIncidents, timeRange]);

  const stats = useMemo(() => {
    const healthy = services.filter((s) => s.status === "healthy").length;
    const critical = incidents.filter((i) => i.severity === "critical").length;
    const warning = incidents.filter((i) => i.severity === "warning").length;
    const active = incidents.filter(
      (i) => i.status === "open" || i.status === "investigating",
    ).length;
    const errors = services.reduce((sum, s) => sum + s.errorCount, 0);
    return { total: services.length, healthy, critical, warning, active, errors };
  }, [services, incidents]);

  const severitySegments = useMemo(
    () => [
      { label: "Critical", value: stats.critical, color: redesign.red },
      { label: "Warning", value: stats.warning, color: redesign.amber },
      {
        label: "Info",
        value: incidents.filter((i) => i.severity === "info").length,
        color: redesign.blue,
      },
    ],
    [incidents, stats.critical, stats.warning],
  );

  // The shared Incident model carries no occurrence count, so
  // ordering is severity first, then newest detected. Counts from
  // the mockup are not copied in, since they are not real data.
  const needsAttention = useMemo(() => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return [...incidents]
      .sort(
        (a, b) =>
          rank[a.severity] - rank[b.severity] ||
          Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
      )
      .slice(0, 3);
  }, [incidents]);

  const searchedIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return incidents;
    return incidents.filter((incident) =>
      `${incident.id} ${incident.title} ${incident.serviceId}`
        .toLowerCase()
        .includes(query),
    );
  }, [incidents, search]);

  const recentActivity = useMemo(() => {
    const items: { key: string; text: string; detail: string; time: string }[] = [];
    for (const incident of incidents) {
      items.push({
        key: `incident-${incident.id}`,
        text: "New incident detected",
        detail: incident.title,
        time: incident.detectedAt,
      });
    }
    for (const investigation of investigations) {
      items.push({
        key: `investigation-${investigation.id}`,
        text:
          investigation.status === "completed"
            ? "Investigation completed"
            : "Investigation running",
        detail: investigation.incidentId,
        time: investigation.startedAt,
      });
    }
    return items
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
      .slice(0, 5);
  }, [incidents, investigations]);

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

  // Viewer-local time of day, so the greeting is never wrong the way a
  // hardcoded "Good morning." is at 22:00.
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "Good morning."
      : greetingHour < 18
        ? "Good afternoon."
        : "Good evening.";

  return (
    <main
      className="min-h-full"
      style={{ backgroundColor: redesign.pageBg, color: redesign.text }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-[#8B96B0]">
              Here&apos;s what&apos;s happening with your systems.
            </p>
          </div>
          {incidentsAreDemo ? (
            <DemoBadge />
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-medium text-[#34D399]">
              Live incidents · demo services
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search incidents…"
            aria-label="Search incidents"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3B82F6] sm:max-w-sm"
            style={inputStyle}
          />
          <select
            value={timeRange}
            onChange={(event) =>
              setTimeRange(event.target.value as "24h" | "7d" | "all")
            }
            aria-label="Time range"
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#3B82F6]"
            style={inputStyle}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="mt-4">
          {incidentsAreDemo ? (
            <DemoBanner />
          ) : (
            <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#34D399]">
              Mixed data: incidents on this page come from the
              configured database, while services, health, deployments,
              and investigations here are still demo data.
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load the demo overview. Please try again."}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            <section
              aria-label="Summary"
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <StatCard
                label="Active incidents"
                value={String(stats.active)}
                sub={`${stats.critical} critical, ${stats.warning} warning`}
                icon="◉"
                accent={redesign.red}
              />
              <StatCard
                label="Critical incidents"
                value={String(stats.critical)}
                sub="Requires immediate attention"
                icon="⚠"
                accent={redesign.amber}
              />
              <StatCard
                label="Errors in window"
                value={String(stats.errors)}
                sub="Sum across services"
                icon="▦"
                accent={redesign.blue}
              />
              <StatCard
                label="Services monitored"
                value={String(stats.total)}
                sub={`${stats.healthy} healthy`}
                icon="⬢"
                accent={redesign.violet}
              />
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <Panel label="Error activity" className="lg:col-span-2">
                <PanelTitle action="Demo health points, last 30 minutes">
                  Error activity
                </PanelTitle>
                <div className="mt-3">
                  <BarChart
                    values={health.map((point) => point.errorRate)}
                    labels={health.map((point) => point.timestamp)}
                    label="Error rate trend for payments-api"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#8B96B0]">
                  {health.map((point) => (
                    <span key={point.timestamp}>
                      {formatTime(point.timestamp)}: {point.errorRate.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </Panel>

              <Panel label="Severity breakdown">
                <PanelTitle>Severity breakdown</PanelTitle>
                <div className="mt-4">
                  <DonutChart
                    segments={severitySegments}
                    total={incidents.length}
                    label="Severity breakdown of incidents"
                    centerLabel="incidents"
                  />
                </div>
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <Panel label="Needs attention">
                <PanelTitle action={<Link to="/incidents" className="inline-block py-1 hover:text-[#3B82F6]">View all →</Link>}>
                  Needs attention
                </PanelTitle>
                <ul className="mt-4 space-y-3">
                  {needsAttention.map((incident) => (
                    <li key={incident.id}>
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="flex items-start gap-3 hover:text-[#3B82F6]"
                      >
                        <SeverityBadge severity={incident.severity} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {incident.title}
                          </span>
                          <span className="block text-xs text-[#8B96B0]">
                            {serviceName(incident.serviceId)} · {incident.status} · {formatDateTime(incident.detectedAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {needsAttention.length === 0 ? (
                    <li className="text-sm text-[#8B96B0]">Nothing needs attention.</li>
                  ) : null}
                </ul>
              </Panel>

              <Panel label="Service health">
                <PanelTitle action={<Link to="/services" className="inline-block py-1 hover:text-[#3B82F6]">View all →</Link>}>
                  Service health
                </PanelTitle>
                <ul className="mt-4 space-y-3">
                  {services.map((service) => (
                    <li key={service.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <StatusDot status={service.status} />
                        <span className="truncate">{service.name}</span>
                      </span>
                      <span className="shrink-0 text-xs capitalize text-[#8B96B0]">
                        {service.status} · {service.errorCount} errors
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel label="Recent activity">
                <PanelTitle>Recent activity</PanelTitle>
                <ul className="mt-4 space-y-3">
                  {recentActivity.map((item) => (
                    <li key={item.key} className="text-sm">
                      <p className="font-medium">{item.text}</p>
                      <p className="truncate text-xs text-[#8B96B0]">
                        {item.detail} · {formatDateTime(item.time)}
                      </p>
                    </li>
                  ))}
                  {recentActivity.length === 0 ? (
                    <li className="text-sm text-[#8B96B0]">No recent activity.</li>
                  ) : null}
                </ul>
              </Panel>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <Panel label="Recent incidents" className="lg:col-span-2">
                <PanelTitle action={<Link to="/incidents" className="inline-block py-1 hover:text-[#3B82F6]">View all →</Link>}>
                  Recent incidents{" "}
                  {incidentsAreDemo ? (
                    <DemoBadge />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/15 px-2 py-0.5 text-[11px] font-medium text-[#34D399]">
                      Live
                    </span>
                  )}
                </PanelTitle>
                {searchedIncidents.length === 0 && allIncidents.length > 0 ? (
                  <p className="mt-3 text-sm text-[#8B96B0]">
                    No incidents in this time window. Try All time to see
                    older incidents.
                  </p>
                ) : null}
                <ul className="mt-3 divide-y divide-[#1E2A44]">
                  {searchedIncidents.map((incident) => (
                    <li key={incident.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <SeverityBadge severity={incident.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          <span className="font-mono text-xs text-[#8B96B0]">{incident.id}</span>{" "}
                          <Link to={`/incidents/${incident.id}`} className="hover:text-[#3B82F6]">
                            {incident.title}
                          </Link>
                        </p>
                        <p className="mt-0.5 text-xs text-[#8B96B0]">
                          {serviceName(incident.serviceId)} · {incident.status} · investigation{" "}
                          {incident.investigationStatus} · {formatDateTime(incident.detectedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                  {searchedIncidents.length === 0 ? (
                    <li className="py-3 text-sm text-[#8B96B0]">
                      No incidents match this search and time range.
                    </li>
                  ) : null}
                </ul>
              </Panel>

              <Panel label="Recent deployments">
                <PanelTitle>Recent deployments</PanelTitle>
                <ul className="mt-3 space-y-3 text-sm">
                  {deployments.map((deployment) => (
                    <li key={deployment.id} className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-medium">{serviceName(deployment.serviceId)}</span>{" "}
                        <span className="font-mono text-xs text-[#8B96B0]">{deployment.version}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#8B96B0]">
                        {formatDateTime(deployment.deployedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { Link, useParams } from "react-router";

import { DemoBadge, SeverityBadge, StatusDot } from "@/components/tracemind/badges";
import {
  DemoBanner,
  Sparkline,
} from "@/components/tracemind/dashboard-bits";
import {
  formatDateTime,
  formatTime,
  providerLabel,
} from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Service detail — TraceMind" }];
}

export default function ServiceDetailRoute() {
  const { serviceId } = useParams();
  const servicesQuery = useActionQuery("list-services", {});
  const healthQuery = useActionQuery("get-service-health", {
    serviceId: serviceId ?? "",
  });
  const deploymentsQuery = useActionQuery("list-deployments", {});
  const incidentsQuery = useActionQuery("list-incidents", {});

  const services = servicesQuery.data?.services ?? [];
  const health = healthQuery.data?.health ?? [];
  const deployments = deploymentsQuery.data?.deployments ?? [];
  const incidents = incidentsQuery.data?.incidents ?? [];

  const service = services.find((s) => s.id === serviceId);
  const loading =
    servicesQuery.isPending ||
    healthQuery.isPending ||
    deploymentsQuery.isPending ||
    incidentsQuery.isPending;
  const error =
    servicesQuery.error ??
    healthQuery.error ??
    deploymentsQuery.error ??
    incidentsQuery.error;

  const serviceDeployments = deployments.filter(
    (deployment) => deployment.serviceId === serviceId,
  );
  const serviceIncidents = incidents.filter(
    (incident) => incident.serviceId === serviceId,
  );

  return (
    <main className="min-h-full bg-[#101114] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/services" className="text-sm text-[#5B8DEF] hover:underline">
          ← Back to services
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5B8DEF]">
              Service detail
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {loading ? "Loading…" : (service?.name ?? "Service not found")}
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
              "Could not load this service. Please try again."}
          </div>
        ) : null}

        {!loading && !service ? (
          <div className="mt-5 rounded-xl border border-[#2B2E36] bg-[#181A20] px-4 py-6">
            <p className="text-sm">
              No service with id <span className="font-mono">{serviceId}</span>{" "}
              exists in the demo dataset.
            </p>
            <Link
              to="/services"
              className="mt-3 inline-block rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm text-[#5B8DEF]"
            >
              Back to services
            </Link>
          </div>
        ) : null}

        {service ? (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Status</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold capitalize">
                  <StatusDot status={service.status} />
                  {service.status}
                </p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Provider</p>
                <p className="mt-2 text-lg font-semibold">{providerLabel(service.provider)}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Errors in window</p>
                <p className="mt-2 text-lg font-semibold">{service.errorCount}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Monitoring</p>
                <p className="mt-2 text-lg font-semibold">
                  {service.monitoringEnabled ? "Enabled" : "Disabled"}
                </p>
                <p className="mt-1 text-xs text-[#969CA9]">
                  Last checked {formatDateTime(service.lastCheckedAt)}
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
              <h2 className="text-sm font-semibold">
                Monitoring history <DemoBadge />
              </h2>
              {health.length === 0 ? (
                <p className="mt-3 text-sm text-[#969CA9]">
                  No demo health points exist for this service yet. The backend
                  developer's monitoring history will fill this section when it
                  lands; nothing here is fabricated to fill the gap.
                </p>
              ) : (
                <>
                  <div className="mt-3">
                    <Sparkline
                      values={health.map((point) => point.errorRate)}
                      stroke="#EF4444"
                      label={`Error rate trend for ${service.name}`}
                    />
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="text-xs text-[#969CA9]">
                          <th className="py-2 pr-3 font-medium">Time</th>
                          <th className="py-2 pr-3 font-medium">Error rate</th>
                          <th className="py-2 pr-3 font-medium">Requests</th>
                          <th className="py-2 pr-3 font-medium">p95 latency</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {health.map((point) => (
                          <tr key={point.timestamp} className="border-t border-[#2B2E36]">
                            <td className="py-2.5 pr-3">{formatTime(point.timestamp)}</td>
                            <td className="py-2.5 pr-3">{point.errorRate.toFixed(1)}%</td>
                            <td className="py-2.5 pr-3">{point.requestCount}</td>
                            <td className="py-2.5 pr-3">{point.p95LatencyMs} ms</td>
                            <td className="py-2.5 capitalize">{point.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <h2 className="text-sm font-semibold">Recent deployments</h2>
                {serviceDeployments.length === 0 ? (
                  <p className="mt-3 text-sm text-[#969CA9]">
                    No demo deployments recorded for this service.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm">
                    {serviceDeployments.map((deployment) => (
                      <li key={deployment.id} className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-xs text-[#969CA9]">{deployment.version}</span>
                        <span className="text-xs text-[#969CA9]">
                          {formatDateTime(deployment.deployedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <h2 className="text-sm font-semibold">Incidents for this service</h2>
                {serviceIncidents.length === 0 ? (
                  <p className="mt-3 text-sm text-[#969CA9]">
                    No demo incidents for this service.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {serviceIncidents.map((incident) => (
                      <li key={incident.id} className="flex flex-wrap items-start gap-3">
                        <SeverityBadge severity={incident.severity} />
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="text-sm font-medium hover:text-[#5B8DEF]"
                        >
                          {incident.title}
                        </Link>
                        <span className="text-xs text-[#969CA9]">
                          {incident.status} · {formatDateTime(incident.detectedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

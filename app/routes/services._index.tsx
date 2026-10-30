import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import {
  IconBrandGithub,
  IconBrandAws,
  IconCloud,
  IconCube,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconArrowRight,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { DemoBadge } from "@/components/tracemind/badges";
import { Button } from "@/components/ui/button";
import { formatDateTime, providerLabel } from "@/lib/tracemind/format";

import type {
  Service,
  ServiceProvider,
  ServiceStatus,
} from "../../shared/tracemind/models.js";

export function meta() {
  return [{ title: "Services — TraceMind" }];
}
const statusLabels: Record<ServiceStatus, string> = {
  healthy: "Operational",
  degraded: "Degraded",
  down: "Critical",
  unknown: "Unknown",
};
function ProviderIcon({ provider }: { provider: ServiceProvider }) {
  const Icon =
    provider === "github"
      ? IconBrandGithub
      : provider === "aws"
        ? IconBrandAws
        : IconCloud;
  return (
    <Icon
      className="size-5 shrink-0 text-muted-foreground"
      strokeWidth={1.6}
      aria-hidden="true"
    />
  );
}
function ServiceBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className="tm-status" data-status={status}>
      {statusLabels[status]}
    </span>
  );
}
function ServiceName({ service }: { service: Service }) {
  return (
    <span className="tm-service-name">
      <IconCube
        className="size-5 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">
        {service.name}
        <small>{providerLabel(service.provider)}</small>
      </span>
    </span>
  );
}
export default function ServicesRoute() {
  const servicesQuery = useActionQuery("list-services", {});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [monitoring, setMonitoring] = useState("all");
  const services = servicesQuery.data?.services ?? [];
  const filtered = useMemo(
    () =>
      services.filter((service) => {
        if (status !== "all" && service.status !== status) return false;
        if (provider !== "all" && service.provider !== provider) return false;
        if (monitoring === "enabled" && !service.monitoringEnabled)
          return false;
        if (monitoring === "disabled" && service.monitoringEnabled)
          return false;
        return (
          !query.trim() ||
          service.name.toLowerCase().includes(query.trim().toLowerCase())
        );
      }),
    [services, query, status, provider, monitoring],
  );
  const healthy = services.filter((s) => s.status === "healthy").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const critical = services.filter((s) => s.status === "down").length;
  const monitored = services.filter((s) => s.monitoringEnabled).length;
  const coverage = services.length
    ? Math.round((monitored / services.length) * 100)
    : 0;
  const attention = services.filter(
    (s) => s.status === "down" || s.status === "degraded",
  );
  const paused = services.filter((s) => !s.monitoringEnabled);
  const hasFilters = Boolean(
    query || status !== "all" || provider !== "all" || monitoring !== "all",
  );
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setProvider("all");
    setMonitoring("all");
  };
  const isDemo = servicesQuery.data?.demo ?? true;
  return (
    <div className="tm-services">
      <div className="tm-page-heading">
        <div>
          <h1>Services</h1>
          <p>Monitor health across your connected infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && <DemoBadge />}
          <Button asChild size="sm">
            <Link to="/integrations">
              <IconPlus className="size-4" />
              Connect service
            </Link>
          </Button>
        </div>
      </div>
      {isDemo && (
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          Showing sample services. Health and monitoring states below are demo
          data.
        </p>
      )}
      {servicesQuery.error ? (
        <div role="alert" className="tm-panel p-5 text-sm text-red-300">
          <p>
            {actionErrorMessage(servicesQuery.error) ??
              "Could not load services."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void servicesQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : servicesQuery.isPending ? (
        <div role="status" aria-label="Loading services" className="space-y-5">
          <div className="h-28 animate-pulse rounded-xl bg-card" />
          <div className="h-96 animate-pulse rounded-xl bg-card" />
        </div>
      ) : (
        <>
          <section className="tm-summary" aria-label="Service summary">
            <div>
              <strong>{services.length}</strong>
              <span>Total services</span>
            </div>
            <div>
              <strong>{healthy}</strong>
              <span>Operational</span>
            </div>
            <div>
              <strong className="text-amber-300">{degraded}</strong>
              <span>Degraded</span>
            </div>
            <div>
              <strong className="text-red-400">{critical}</strong>
              <span>Critical</span>
            </div>
          </section>
          <section className="tm-panel" aria-label="Services directory">
            <div className="tm-toolbar">
              <label className="tm-search relative min-w-0 flex-1">
                <IconSearch
                  className="absolute left-3 top-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search services…"
                  aria-label="Search services by name"
                  className="tm-field w-full pl-9"
                />
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                aria-label="Filter by provider"
                className="tm-field"
              >
                <option value="all">All providers</option>
                <option value="gcp-run">Google Cloud Run</option>
                <option value="github">GitHub</option>
                <option value="aws">AWS</option>
                <option value="other">Other</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="tm-field"
              >
                <option value="all">All statuses</option>
                <option value="healthy">Operational</option>
                <option value="degraded">Degraded</option>
                <option value="down">Critical</option>
                <option value="unknown">Unknown</option>
              </select>
              <select
                value={monitoring}
                onChange={(e) => setMonitoring(e.target.value)}
                aria-label="Filter by monitoring"
                className="tm-field"
              >
                <option value="all">Monitoring</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Paused</option>
              </select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <div className="tm-desktop-services overflow-x-auto">
              <table className="tm-table">
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Status</th>
                    <th scope="col">Errors</th>
                    <th scope="col">Monitoring</th>
                    <th scope="col">Last checked</th>
                    <th scope="col">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((service) => (
                    <tr
                      key={service.id}
                      data-critical={service.status === "down"}
                    >
                      <td>
                        <Link
                          to={`/services/${service.id}`}
                          className="hover:text-primary focus-visible:outline-primary"
                        >
                          <ServiceName service={service} />
                        </Link>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <ProviderIcon provider={service.provider} />
                          <span className="tm-provider-label text-muted-foreground">
                            {providerLabel(service.provider)}
                          </span>
                        </span>
                      </td>
                      <td>
                        <ServiceBadge status={service.status} />
                      </td>
                      <td
                        className={`tabular-nums ${service.status === "down" ? "text-red-400" : service.status === "degraded" ? "text-amber-300" : "text-muted-foreground"}`}
                      >
                        {service.errorCount.toLocaleString()}
                      </td>
                      <td>
                        <span
                          className="tm-monitor"
                          data-enabled={service.monitoringEnabled}
                        >
                          {service.monitoringEnabled ? "Enabled" : "Paused"}
                        </span>
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap">
                        <time dateTime={service.lastCheckedAt}>
                          {formatDateTime(service.lastCheckedAt)}
                        </time>
                      </td>
                      <td>
                        <Link
                          to={`/services/${service.id}`}
                          aria-label={`View ${service.name}`}
                          className="flex size-8 items-center justify-center rounded-md hover:bg-secondary focus-visible:outline-primary"
                        >
                          <IconChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tm-mobile-services">
              {filtered.map((service) => (
                <Link
                  key={service.id}
                  to={`/services/${service.id}`}
                  className="tm-mobile-service hover:bg-secondary focus-visible:outline-primary"
                  data-critical={service.status === "down"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <ServiceName service={service} />
                    <ServiceBadge status={service.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 pl-8 text-xs">
                    <span
                      className={
                        service.status === "down"
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }
                    >
                      {service.errorCount} errors
                    </span>
                    <span
                      className="tm-monitor"
                      data-enabled={service.monitoringEnabled}
                    >
                      {service.monitoringEnabled ? "Enabled" : "Paused"}
                    </span>
                    <IconChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 pl-8 text-[11px] text-muted-foreground">
                    Checked {formatDateTime(service.lastCheckedAt)}
                  </p>
                </Link>
              ))}
            </div>
            {!filtered.length && (
              <div className="px-5 py-12 text-center">
                <IconSearch className="mx-auto mb-3 size-6 text-muted-foreground" />
                <p className="text-sm">
                  {services.length
                    ? "No services match these filters."
                    : "No services to display."}
                </p>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    className="mt-4"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Link
                    to="/integrations"
                    className="mt-3 inline-block text-sm text-primary"
                  >
                    Connect a service
                  </Link>
                )}
              </div>
            )}
            <p className="tm-table-footer" aria-live="polite">
              Showing {filtered.length} of {services.length} services
              {isDemo ? " · Demo data" : ""}
            </p>
          </section>
          <div className="tm-secondary-panels">
            <section
              className="tm-panel"
              aria-label="Services needing attention"
            >
              <h2>
                Needs attention{" "}
                <span className="ml-1 text-muted-foreground">
                  {attention.length}
                </span>
              </h2>
              {attention.map((service) => (
                <Link
                  to={`/services/${service.id}`}
                  className="tm-attention-row hover:text-primary"
                  key={service.id}
                >
                  <div className="min-w-0 flex-1">
                    <ServiceName service={service} />
                    <p className="mt-2 pl-8 text-xs text-muted-foreground">
                      {service.errorCount} errors in the reporting window
                    </p>
                  </div>
                  <ServiceBadge status={service.status} />
                  <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              {!attention.length && (
                <p className="text-sm text-muted-foreground">
                  No services currently need attention.
                </p>
              )}
            </section>
            <section className="tm-panel" aria-label="Monitoring coverage">
              <h2>Monitoring coverage</h2>
              <div
                role="progressbar"
                aria-label="Services with monitoring enabled"
                aria-valuenow={coverage}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${coverage}%` }}
                />
              </div>
              <p className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>
                  {monitored} of {services.length} services monitored
                </span>
                <span>{coverage}%</span>
              </p>
              {paused.map((service) => (
                <Link
                  to={`/services/${service.id}`}
                  key={service.id}
                  className="tm-attention-row mt-4"
                >
                  <div className="flex-1">
                    <ServiceName service={service} />
                    <p className="mt-2 pl-8 text-xs text-muted-foreground">
                      Monitoring is paused.
                    </p>
                  </div>
                  <span className="tm-status text-amber-300">Paused</span>
                  <IconArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
              {isDemo && (
                <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Coverage reflects sample service settings, not live
                  collectors.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

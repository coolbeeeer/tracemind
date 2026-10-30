import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { Link, useParams } from "react-router";

import { DemoBadge, SeverityBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import { formatDateTime } from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Incident detail — TraceMind" }];
}

export default function IncidentDetailRoute() {
  const { incidentId } = useParams();
  const incidentQuery = useActionQuery("get-incident", {
    id: incidentId ?? "",
  });
  const servicesQuery = useActionQuery("list-services", {});
  const investigationsQuery = useActionQuery("list-investigations", {});

  const incident = incidentQuery.data?.incident ?? null;
  // Same rule as the incidents list: the banner follows the action's
  // demo flag, so a live incident is never labelled demo.
  const isDemo = incidentQuery.data?.demo ?? true;
  const services = servicesQuery.data?.services ?? [];
  const investigations = investigationsQuery.data?.investigations ?? [];
  const investigation = investigations.find(
    (inv) => inv.incidentId === incidentId,
  );
  const service = services.find((s) => s.id === incident?.serviceId);

  const loading =
    incidentQuery.isPending ||
    servicesQuery.isPending ||
    investigationsQuery.isPending;
  const error =
    incidentQuery.error ?? servicesQuery.error ?? investigationsQuery.error;

  return (
    <main className="min-h-full bg-[#070B16] text-[#E8EDF7]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/incidents" className="inline-block py-1 text-sm text-[#60A5FA] hover:underline">
          ← Back to incidents
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#60A5FA]">
              Incident detail
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {loading ? "Loading…" : (incident?.title ?? "Incident not found")}
            </h1>
            {incident ? (
              <p className="mt-1 font-mono text-xs text-[#8B96B0]">
                {incident.id}
              </p>
            ) : null}
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
              Live data: this incident comes from the configured database,
              not the demo dataset.
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load this incident. Please try again."}
          </div>
        ) : null}

        {!loading && !incident ? (
          <div className="mt-5 rounded-2xl border border-[#1E2A44] bg-[#0E1526] px-4 py-6">
            <p className="text-sm">
              No incident with id{" "}
              <span className="font-mono">{incidentId}</span> exists in the
              {isDemo ? " demo dataset." : " database."}
            </p>
            <Link
              to="/incidents"
              className="mt-3 inline-block rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-2 text-sm text-[#60A5FA]"
            >
              Back to incidents
            </Link>
          </div>
        ) : null}

        {incident ? (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B96B0]">Severity</p>
                <div className="mt-2">
                  <SeverityBadge severity={incident.severity} />
                </div>
              </div>
              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B96B0]">Status</p>
                <p className="mt-2 text-lg font-semibold capitalize">{incident.status}</p>
              </div>
              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B96B0]">Investigation</p>
                <p className="mt-2 text-lg font-semibold">{incident.investigationStatus}</p>
              </div>
              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B96B0]">Detected</p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(incident.detectedAt)}</p>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <h2 className="text-sm font-semibold">Description</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#E8EDF7]">
                  {incident.description}
                </p>
                <h3 className="mt-5 text-sm font-semibold">Affected service</h3>
                {service ? (
                  <Link
                    to={`/services/${service.id}`}
                    className="mt-2 inline-block text-sm font-medium hover:text-[#60A5FA]"
                  >
                    {service.name} →
                  </Link>
                ) : (
                  <p className="mt-2 font-mono text-sm text-[#8B96B0]">
                    {incident.serviceId}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[#1E2A44] bg-[#0E1526] p-4">
                <h2 className="text-sm font-semibold">
                  Investigation summary <DemoBadge />
                </h2>
                {!investigation ? (
                  <p className="mt-3 text-sm text-[#8B96B0]">
                    No demo investigation record exists for this incident yet.
                    The full Investigation Workspace lands in the next chunk;
                    until then, nothing here claims an agent has run.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-sm">
                      Investigation <span className="font-mono">{investigation.id}</span> ·{" "}
                      {investigation.status} · {investigation.steps.length} demo
                      steps · started {formatDateTime(investigation.startedAt)}
                    </p>
                    <p className="mt-3 text-xs text-[#8B96B0]">
                      This summary is synthetic demo data. Open the full
                      workspace for logs, timeline, hypotheses, evidence,
                      fixes, and agent conversation.
                    </p>
                    <Link
                      to={`/investigations/${investigation.id}`}
                      className="mt-3 inline-block rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-2 text-sm font-medium text-[#60A5FA]"
                    >
                      Open Investigation Workspace →
                    </Link>
                    <ul className="mt-4 space-y-2 text-sm">
                      {investigation.hypotheses.map((hypothesis) => (
                        <li key={hypothesis.id}>
                          {hypothesis.title} ({hypothesis.confidence}%)
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

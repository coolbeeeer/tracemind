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
    <main className="min-h-full bg-[#101114] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/incidents" className="inline-block py-1 text-sm text-[#8AACF4] hover:underline">
          ← Back to incidents
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8AACF4]">
              Incident detail
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {loading ? "Loading…" : (incident?.title ?? "Incident not found")}
            </h1>
            {incident ? (
              <p className="mt-1 font-mono text-xs text-[#969CA9]">
                {incident.id}
              </p>
            ) : null}
          </div>
          {isDemo ? (
            <DemoBadge />
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#5B8DEF]/30 bg-[#5B8DEF]/15 px-2 py-0.5 text-[11px] font-medium text-[#8AACF4]">
              Live
            </span>
          )}
        </div>

        <div className="mt-5">
          {isDemo ? (
            <DemoBanner />
          ) : (
            <div className="rounded-xl border border-[#5B8DEF]/30 bg-[#5B8DEF]/10 px-4 py-3 text-sm text-[#8AACF4]">
              Live data: this incident comes from the configured database,
              not the demo dataset.
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load this incident. Please try again."}
          </div>
        ) : null}

        {!loading && !incident ? (
          <div className="mt-5 rounded-xl border border-[#2B2E36] bg-[#181A20] px-4 py-6">
            <p className="text-sm">
              No incident with id{" "}
              <span className="font-mono">{incidentId}</span> exists in the
              {isDemo ? " demo dataset." : " database."}
            </p>
            <Link
              to="/incidents"
              className="mt-3 inline-block rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm text-[#8AACF4]"
            >
              Back to incidents
            </Link>
          </div>
        ) : null}

        {incident ? (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Severity</p>
                <div className="mt-2">
                  <SeverityBadge severity={incident.severity} />
                </div>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Status</p>
                <p className="mt-2 text-lg font-semibold capitalize">{incident.status}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Investigation</p>
                <p className="mt-2 text-lg font-semibold">{incident.investigationStatus}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Detected</p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(incident.detectedAt)}</p>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <h2 className="text-sm font-semibold">Description</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#ECEEF2]">
                  {incident.description}
                </p>
                <h3 className="mt-5 text-sm font-semibold">Affected service</h3>
                {service ? (
                  <Link
                    to={`/services/${service.id}`}
                    className="mt-2 inline-block text-sm font-medium hover:text-[#8AACF4]"
                  >
                    {service.name} →
                  </Link>
                ) : (
                  <p className="mt-2 font-mono text-sm text-[#969CA9]">
                    {incident.serviceId}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <h2 className="text-sm font-semibold">
                  Investigation summary <DemoBadge />
                </h2>
                {!investigation ? (
                  <p className="mt-3 text-sm text-[#969CA9]">
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
                    <p className="mt-3 text-xs text-[#969CA9]">
                      This summary is synthetic demo data. Open the full
                      workspace for logs, timeline, hypotheses, evidence,
                      fixes, and agent conversation.
                    </p>
                    <Link
                      to={`/investigations/${investigation.id}`}
                      className="mt-3 inline-block rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm font-medium text-[#8AACF4]"
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

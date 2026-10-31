import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { Link } from "react-router";

import { DemoBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import { formatDateTime } from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Investigations — TraceMind" }];
}

export default function InvestigationsRoute() {
  const investigationsQuery = useActionQuery("list-investigations", {});
  const investigations = investigationsQuery.data?.investigations ?? [];

  return (
    <main className="min-h-full bg-[#0A0B10] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8AACF4]">
              Investigations
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Investigations
            </h1>
            <p className="mt-1 text-sm text-[#969CA9]">
              Demo investigation records only. No agent has run anything
              here yet; the workspace shows what a real investigation
              record will look like.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {investigationsQuery.error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(investigationsQuery.error) ??
              "Could not load investigations. Please try again."}
          </div>
        ) : null}

        {investigationsQuery.isPending ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#14161D] h-64" aria-label="Loading" />
        ) : (
          <section className="mt-6 rounded-xl border border-[#232833] bg-[#14161D] p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-[#969CA9]">
                    <th className="py-2 pr-3 font-medium">Investigation</th>
                    <th className="py-2 pr-3 font-medium">Incident</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Steps</th>
                    <th className="py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {investigations.map((investigation) => (
                    <tr key={investigation.id} className="border-t border-[#232833]">
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/investigations/${investigation.id}`}
                          className="font-medium hover:text-[#8AACF4]"
                        >
                          {investigation.id}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/incidents/${investigation.incidentId}`}
                          className="hover:text-[#8AACF4]"
                        >
                          {investigation.incidentId}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">{investigation.status}</td>
                      <td className="py-2.5 pr-3">{investigation.steps.length}</td>
                      <td className="py-2.5 text-[#969CA9]">
                        {formatDateTime(investigation.startedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {investigations.length === 0 ? (
              <p className="mt-4 text-sm text-[#969CA9]">
                No demo investigations yet.
              </p>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

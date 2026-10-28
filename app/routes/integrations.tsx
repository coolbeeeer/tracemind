import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";

import { DemoBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";
import type { Integration } from "../../shared/tracemind/models.js";

export function meta() {
  return [{ title: "Integrations — TraceMind" }];
}

const statusStyles: Record<Integration["status"], string> = {
  connected: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30",
  "not-connected": "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  "coming-soon": "bg-white/5 text-[#8B94A7] border-white/10",
};

const statusLabel: Record<Integration["status"], string> = {
  connected: "Connected",
  "not-connected": "Disconnected",
  "coming-soon": "Unavailable",
};

const permissionText: Record<Integration["provider"], string> = {
  "gcp-run":
    "When the backend lands, Google Cloud Run connection will request read-only access to Cloud Run services and Cloud Logging. It will not deploy, modify, or delete anything, and it will not store cloud credentials in the browser.",
  github:
    "When the backend lands, GitHub connection will request read access to repository contents for code inspection during investigations. It will not write code, open pull requests, or store GitHub tokens in the browser.",
  aws: "AWS is coming soon, per the brief. No permissions are requested in this demo.",
  other: "Other providers are coming soon. No permissions are requested in this demo.",
};

export default function IntegrationsRoute() {
  const integrationsQuery = useActionQuery("list-integrations", {});
  const integrations = integrationsQuery.data?.integrations ?? [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const connected = integrations.filter((i) => i.status === "connected").length;
  const disconnected = integrations.filter(
    (i) => i.status === "not-connected",
  ).length;
  const unavailable = integrations.filter(
    (i) => i.status === "coming-soon",
  ).length;

  return (
    <main className="min-h-full bg-[#0A0C10] text-[#E6EAF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">
              Integrations
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Integrations
            </h1>
            <p className="mt-1 text-sm text-[#8B94A7]">
              Connection status for the providers TraceMind monitors. No
              connection is active in demo mode, and no OAuth flow is
              started from this page.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {integrationsQuery.error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(integrationsQuery.error) ??
              "Could not load integrations. Please try again."}
          </div>
        ) : null}

        {integrationsQuery.isPending ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#11141B] h-64" aria-label="Loading" />
        ) : (
          <>
            <section
              aria-label="Connection summary"
              className="mt-5 grid gap-4 sm:grid-cols-3"
            >
              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B94A7]">Connected</p>
                <p className="mt-2 text-3xl font-semibold">{connected}</p>
              </div>
              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B94A7]">Disconnected</p>
                <p className="mt-2 text-3xl font-semibold text-[#F87171]">{disconnected}</p>
              </div>
              <div className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8B94A7]">Unavailable</p>
                <p className="mt-2 text-3xl font-semibold text-[#8B94A7]">{unavailable}</p>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              {integrations.map((integration) => {
                const isExpanded = expanded[integration.id] ?? false;
                return (
                  <div
                    key={integration.id}
                    className="rounded-xl border border-[#1E2430] bg-[#11141B] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">{integration.label}</h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[integration.status]}`}
                      >
                        {statusLabel[integration.status]}
                      </span>
                    </div>
                    {integration.note ? (
                      <p className="mt-2 text-sm text-[#8B94A7]">{integration.note}</p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      Last connection attempt:{" "}
                      <span className="text-[#8B94A7]">
                        {integration.connectedAt
                          ? integration.connectedAt
                          : "Never attempted in demo mode"}
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [integration.id]: !isExpanded,
                        }))
                      }
                      aria-expanded={isExpanded}
                      className="mt-3 rounded-lg border border-[#1E2430] px-3 py-2 text-sm text-[#E6EAF2] hover:border-[#10B981]/40"
                    >
                      {isExpanded
                        ? "Hide permission explanation"
                        : "How connection will work"}
                    </button>

                    {isExpanded ? (
                      <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm leading-relaxed">
                        {permissionText[integration.provider]}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled
                        title="Backend OAuth is not available yet, so no connection can be started from here."
                        className="cursor-not-allowed rounded-lg border border-[#1E2430] px-3 py-2 text-sm text-[#8B94A7] opacity-60"
                      >
                        Connect (backend-gated)
                      </button>
                      <span className="self-center text-xs text-[#8B94A7]">
                        Connect is disabled until the backend OAuth flow
                        lands. It does not open a sign-in page or store any
                        credential.
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4">
              <h2 className="text-sm font-semibold">How errors will be shown</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#8B94A7]">
                No connection error is recorded in demo mode, so none is
                invented here. When the backend lands, a failed connection
                attempt will show the backend's error code and message on
                the affected card, with the connection remaining in the
                Disconnected state until a successful backend confirmation
                arrives. A connection is only shown as Connected after
                that backend confirmation, never from this frontend alone.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

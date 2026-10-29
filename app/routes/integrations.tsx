import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router";

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

const gcpProjectIdPattern = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;

export default function IntegrationsRoute() {
  const [searchParams] = useSearchParams();
  const googleResult = searchParams.get("google");
  const connectMutation = useActionMutation("start-google-connection", {
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    },
  });
  const integrationsQuery = useActionQuery("list-integrations", {});
  const integrations = integrationsQuery.data?.integrations ?? [];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [projectIdInput, setProjectIdInput] = useState("");
  const [submittedProjectId, setSubmittedProjectId] = useState<string | null>(null);
  const [projectIdError, setProjectIdError] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<number | null>(null);
  const gcpPlanQuery = useActionQuery(
    "prepare-gcp-connection",
    { projectId: submittedProjectId ?? "" },
    { enabled: submittedProjectId !== null },
  );
  const gcpPlan = gcpPlanQuery.data ?? null;

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

        {googleResult === "connected" ? (
          <div className="mt-5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#34D399]">
            Google Cloud connected. Log-read access was granted through Google sign-in.
          </div>
        ) : googleResult === "denied" ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            Google Cloud connection was not granted. You can try connecting again.
          </div>
        ) : googleResult === "failed" ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            Google Cloud connection could not be completed. Please try again.
          </div>
        ) : null}

        <section
          aria-label="Connect Google Cloud"
          className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4"
        >
          <h2 className="text-sm font-semibold">Connect Google Cloud</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8B94A7]">
            Sign in with Google and grant read-only access to Cloud
            Logging. TraceMind reads only logs you can already read;
            it does not deploy, modify, or delete anything, and it
            never stores cloud credentials in the browser.
          </p>
          <button
            type="button"
            disabled={connectMutation.isPending}
            onClick={() => connectMutation.mutate({})}
            className="mt-4 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981] hover:bg-[#10B981]/20 disabled:opacity-50"
          >
            {connectMutation.isPending ? "Connecting…" : "Connect Google Cloud"}
          </button>
          {connectMutation.error ? (
            <p className="mt-2 text-sm text-[#F87171]">
              {actionErrorMessage(connectMutation.error) ??
                "Could not start the Google Cloud connection. Please try again."}
            </p>
          ) : null}
        </section>

        <section
          aria-label="Set up Google Cloud"
          className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Set up Google Cloud</h2>
            <span className="inline-flex items-center rounded-full border border-[#EF4444]/30 bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-medium text-[#F87171]">
              Not connected
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#8B94A7]">
            This prepares an administrator-reviewed, keyless setup plan. It
            does not connect anything, grant permissions, start OAuth, or
            store any credential. Monitoring stays off until the backend
            verifies read access and the project owner authorises it.
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = projectIdInput.trim();
              if (!gcpProjectIdPattern.test(value)) {
                setProjectIdError(
                  "Enter a valid Google Cloud project ID: lowercase letters, digits, and hyphens, starting with a letter, 6 to 63 characters.",
                );
                return;
              }
              setProjectIdError(null);
              setCopiedCommand(null);
              setSubmittedProjectId(value);
            }}
          >
            <label className="sr-only" htmlFor="gcp-project-id">
              Google Cloud project ID
            </label>
            <input
              id="gcp-project-id"
              value={projectIdInput}
              onChange={(event) => setProjectIdInput(event.target.value)}
              placeholder="e.g. elantra-gameolive"
              autoComplete="off"
              className="rounded-lg border border-[#1E2430] bg-[#0A0C10] px-3 py-2 text-sm text-[#E6EAF2] outline-none focus:border-[#10B981]"
            />
            <button
              type="submit"
              className="rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981] hover:bg-[#10B981]/20"
            >
              Prepare setup plan
            </button>
          </form>
          {projectIdError ? (
            <p className="mt-2 text-sm text-[#F87171]">{projectIdError}</p>
          ) : null}
          {gcpPlanQuery.error ? (
            <p className="mt-2 text-sm text-[#F87171]">
              {actionErrorMessage(gcpPlanQuery.error) ??
                "Could not prepare the setup plan. Please try again."}
            </p>
          ) : null}
          {gcpPlanQuery.isPending && submittedProjectId ? (
            <p className="mt-3 text-sm text-[#8B94A7]">Preparing the setup plan…</p>
          ) : null}
          {gcpPlan ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm">
                Service account to be created by the administrator:{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs break-all">
                  {gcpPlan.serviceAccountEmail}
                </code>
              </p>
              <div>
                <h3 className="text-sm font-semibold">
                  Commands for a project administrator to review and run
                </h3>
                <ul className="mt-2 space-y-2">
                  {gcpPlan.commands.map((command, index) => (
                    <li
                      key={command}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
                    >
                      <code className="text-xs break-all">{command}</code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(command);
                            setCopiedCommand(index);
                          } catch {
                            setCopiedCommand(null);
                          }
                        }}
                        className="shrink-0 rounded-lg border border-[#1E2430] px-2 py-1 text-xs text-[#E6EAF2] hover:border-[#10B981]/40"
                      >
                        {copiedCommand === index ? "Copied" : "Copy"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Next steps</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#8B94A7]">
                  {gcpPlan.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-[#8B94A7]">
                Status remains Not connected. Do not create or upload
                service-account JSON keys. Only a successful backend
                verification can switch this to Connected.
              </p>
            </div>
          ) : null}
        </section>

        <section
          aria-label="Run as yourself, without project administration"
          className="mt-6 rounded-xl border border-[#1E2430] bg-[#11141B] p-4"
        >
          <h2 className="text-sm font-semibold">No project administration? Run as yourself</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8B94A7]">
            The setup plan above needs a project administrator, because
            granting a role at project level is an administrator-only
            operation. Most users do not have that access. For a demo
            or self-hosted run, the watcher can instead run as the
            operator, using the operator&apos;s own Google login, with
            no service account and no project permission change. It
            reads only what the operator can already read. See
            docs/user-log-access.md in the repository for the probe
            and poll steps. A future product version should replace
            this operator run with a real Google sign-in that grants
            log-read permission directly; that flow is not built yet.
          </p>
        </section>

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

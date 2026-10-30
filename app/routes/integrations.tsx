import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import { useSearchParams } from "react-router";

import type { Integration } from "../../shared/tracemind/models.js";

export function meta() {
  return [{ title: "Integrations — TraceMind" }];
}

const statusStyles: Record<Integration["status"], string> = {
  connected: "bg-[#5B8DEF]/15 text-[#8AACF4] border-[#5B8DEF]/30",
  "not-connected": "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  "coming-soon": "bg-white/5 text-[#969CA9] border-white/10",
};

const statusLabel: Record<Integration["status"], string> = {
  connected: "Connected",
  "not-connected": "Disconnected",
  "coming-soon": "Unavailable",
};

const permissionText: Record<Integration["provider"], string> = {
  "gcp-run":
    "Google Cloud connection requests read-only access to Cloud Logging through Google sign-in, started from the Connect section above. It does not deploy, modify, or delete anything, and tokens are stored server-side, never in the browser.",
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
  const disconnectMutation = useActionMutation("disconnect-google-connection", {
    onSuccess: () => {
      window.location.href = "/integrations?google=disconnected";
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
    <main className="min-h-full bg-[#101114] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8AACF4]">
              Integrations
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Integrations
            </h1>
            <p className="mt-1 text-sm text-[#969CA9]">
              Google Cloud connects from this page through Google
              sign-in. The provider cards below are demo data and do
              not reflect that connection.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#FBBF24]">
            Cards: demo data
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm text-[#ECEEF2]">
          Demo data: the provider cards below are synthetic. They do
          not show whether Google Cloud is actually connected; the
          connection result appears as a banner at the top of this
          page after sign-in.
        </div>

        {googleResult === "connected" ? (
          <div className="mt-5 rounded-xl border border-[#5B8DEF]/30 bg-[#5B8DEF]/10 px-4 py-3 text-sm text-[#8AACF4]">
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
        ) : googleResult === "disconnected" ? (
          <div className="mt-5 rounded-xl border border-[#2B2E36] bg-white/5 px-4 py-3 text-sm text-[#969CA9]">
            Google Cloud disconnected. Its stored tokens and connection record were removed.
          </div>
        ) : null}

        <section
          aria-label="Connect Google Cloud"
          className="mt-6 rounded-xl border border-[#2B2E36] bg-[#181A20] p-4"
        >
          <h2 className="text-sm font-semibold">Connect Google Cloud</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#969CA9]">
            Sign in with Google and grant read-only access to Cloud
            Logging. TraceMind reads only logs you can already read;
            it does not deploy, modify, or delete anything, and it
            never stores cloud credentials in the browser.
          </p>
          <button
            type="button"
            disabled={connectMutation.isPending}
            onClick={() => connectMutation.mutate({})}
            className="mt-4 rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm text-[#8AACF4] hover:bg-[#5B8DEF]/20 disabled:opacity-50"
          >
            {connectMutation.isPending ? "Connecting…" : "Connect Google Cloud"}
          </button>
          {connectMutation.error ? (
            <p className="mt-2 text-sm text-[#F87171]">
              {actionErrorMessage(connectMutation.error) ??
                "Could not start the Google Cloud connection. Please try again."}
            </p>
          ) : null}
          <button
            type="button"
            disabled={disconnectMutation.isPending}
            onClick={() => disconnectMutation.mutate({})}
            className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#969CA9] hover:bg-white/10 disabled:opacity-50"
          >
            {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect Google Cloud"}
          </button>
          {disconnectMutation.error ? (
            <p className="mt-2 text-sm text-[#F87171]">
              {actionErrorMessage(disconnectMutation.error) ??
                "Could not disconnect Google Cloud. Please try again."}
            </p>
          ) : null}
        </section>

        <section
          aria-label="Set up Google Cloud"
          className="mt-6 rounded-xl border border-[#2B2E36] bg-[#181A20] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Set up Google Cloud</h2>
            <span className="inline-flex items-center rounded-full border border-[#EF4444]/30 bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-medium text-[#F87171]">
              Not connected
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#969CA9]">
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
              className="rounded-lg border border-[#2B2E36] bg-[#101114] px-3 py-2 text-sm text-[#ECEEF2] outline-none focus:border-[#5B8DEF]"
            />
            <button
              type="submit"
              className="rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm text-[#8AACF4] hover:bg-[#5B8DEF]/20"
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
            <p className="mt-3 text-sm text-[#969CA9]">Preparing the setup plan…</p>
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
                        className="shrink-0 rounded-lg border border-[#2B2E36] px-2 py-1 text-xs text-[#ECEEF2] hover:border-[#5B8DEF]/40"
                      >
                        {copiedCommand === index ? "Copied" : "Copy"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Next steps</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#969CA9]">
                  {gcpPlan.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-[#969CA9]">
                Status remains Not connected. Do not create or upload
                service-account JSON keys. Only a successful backend
                verification can switch this to Connected.
              </p>
            </div>
          ) : null}
        </section>

        <section
          aria-label="Run as yourself, without project administration"
          className="mt-6 rounded-xl border border-[#2B2E36] bg-[#181A20] p-4"
        >
          <h2 className="text-sm font-semibold">No project administration? Run as yourself</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#969CA9]">
            The setup plan above needs a project administrator, because
            granting a role at project level is an administrator-only
            operation. Most users do not have that access. The Connect
            Google Cloud section above is now the direct sign-in path
            for that access. For a demo or self-hosted run where
            sign-in is not configured, the watcher can instead run as
            the operator, using the operator&apos;s own Google login,
            with no service account and no project permission change.
            It reads only what the operator can already read. See
            docs/user-log-access.md in the repository for the probe
            and poll steps.
          </p>
        </section>

        {integrationsQuery.error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(integrationsQuery.error) ??
              "Could not load integrations. Please try again."}
          </div>
        ) : null}

        {integrationsQuery.isPending ? (
          <div className="mt-5 animate-pulse rounded-xl bg-[#181A20] h-64" aria-label="Loading" />
        ) : (
          <>
            <section
              aria-label="Connection summary"
              className="mt-5 grid gap-4 sm:grid-cols-3"
            >
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Connected</p>
                <p className="mt-2 text-3xl font-semibold">{connected}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Disconnected</p>
                <p className="mt-2 text-3xl font-semibold text-[#F87171]">{disconnected}</p>
              </div>
              <div className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">Unavailable</p>
                <p className="mt-2 text-3xl font-semibold text-[#969CA9]">{unavailable}</p>
              </div>
            </section>

            <section aria-label="Provider cards (demo data)" className="mt-6 grid gap-4 lg:grid-cols-2">
              {integrations.map((integration) => {
                const isExpanded = expanded[integration.id] ?? false;
                return (
                  <div
                    key={integration.id}
                    className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4"
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
                      <p className="mt-2 text-sm text-[#969CA9]">{integration.note}</p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      {integration.provider === "gcp-run" ? (
                        <>
                          Connection:{" "}
                          <span className="text-[#969CA9]">
                            managed in the Connect section above; this
                            card&apos;s status is demo data
                          </span>
                        </>
                      ) : (
                        <>
                          Last connection attempt:{" "}
                          <span className="text-[#969CA9]">
                            {integration.connectedAt
                              ? integration.connectedAt
                              : "Never attempted in demo mode"}
                          </span>
                        </>
                      )}
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
                      className="mt-3 rounded-lg border border-[#2B2E36] px-3 py-2 text-sm text-[#ECEEF2] hover:border-[#5B8DEF]/40"
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

                    {integration.provider === "gcp-run" ? (
                      <p className="mt-3 text-xs text-[#969CA9]">
                        Google Cloud connection starts from the Connect
                        section above. This card&apos;s status is demo
                        data and does not change after connecting.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled
                          title="No sign-in flow exists for this provider yet, so no connection can be started from here."
                          className="cursor-not-allowed rounded-lg border border-[#2B2E36] px-3 py-2 text-sm text-[#969CA9] opacity-60"
                        >
                          Connect (not available)
                        </button>
                        <span className="self-center text-xs text-[#969CA9]">
                          No sign-in flow exists for this provider yet.
                          It does not open a sign-in page or store any
                          credential.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="mt-6 rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
              <h2 className="text-sm font-semibold">How errors will be shown</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#969CA9]">
                A failed Google Cloud sign-in shows a banner at the top
                of this page (not granted, or could not be completed),
                and no error is invented beyond that. The provider cards
                below are demo data, so they do not record connection
                errors. A card is only shown as Connected after a
                backend confirmation, never from this frontend alone.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

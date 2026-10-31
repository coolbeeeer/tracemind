import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";

import { DemoBadge, SeverityBadge } from "@/components/tracemind/badges";
import { DemoBanner, Sparkline } from "@/components/tracemind/dashboard-bits";
import {
  DiffViewer,
  LogTimeline,
  StepStatusBadge,
  ToolTimeline,
} from "@/components/tracemind/investigation-bits";
import {
  formatDateTime,
  formatTime,
  providerLabel,
} from "@/lib/tracemind/format";

export function meta() {
  return [{ title: "Investigation Workspace — TraceMind" }];
}

interface ConversationMessage {
  from: "user" | "system";
  text: string;
  time: string;
}

const inputClass =
  "w-full rounded-lg border border-[#232833] bg-[#14161D] px-3 py-2 text-sm text-[#ECEEF2] outline-none focus:border-[#5B8DEF]";

export default function InvestigationWorkspaceRoute() {
  const { investigationId } = useParams();
  const investigationQuery = useActionQuery("get-investigation", {
    id: investigationId ?? "",
  });
  const investigation = investigationQuery.data?.investigation ?? null;

  const incidentQuery = useActionQuery("get-incident", {
    id: investigation?.incidentId ?? "",
  });
  const incident = incidentQuery.data?.incident ?? null;

  const logsQuery = useActionQuery("list-logs", {
    incidentId: investigation?.incidentId ?? "",
  });
  const logs = logsQuery.data?.logs ?? [];

  const servicesQuery = useActionQuery("list-services", {});
  const services = servicesQuery.data?.services ?? [];
  const service = services.find((s) => s.id === incident?.serviceId);

  const healthQuery = useActionQuery("get-service-health", {
    serviceId: incident?.serviceId ?? "",
  });
  const health = healthQuery.data?.health ?? [];

  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [followUp, setFollowUp] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      from: "system",
      text: "Demo mode: no investigation agent is connected. Follow-ups you submit here are recorded in this session only and are not executed by any agent.",
      time: "—",
    },
  ]);

  const loading =
    investigationQuery.isPending ||
    incidentQuery.isPending ||
    logsQuery.isPending ||
    servicesQuery.isPending ||
    healthQuery.isPending;
  const error =
    investigationQuery.error ??
    incidentQuery.error ??
    logsQuery.error ??
    servicesQuery.error ??
    healthQuery.error;

  const serviceName = (serviceId: string) =>
    services.find((s) => s.id === serviceId)?.name ?? serviceId;

  const steps = investigation?.steps ?? [];
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress =
    steps.length === 0 ? 0 : Math.round((completedSteps / steps.length) * 100);
  const errorLogs = logs.filter((log) => log.level === "error");

  const submitFollowUp = (event: FormEvent) => {
    event.preventDefault();
    const text = followUp.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      { from: "user", text, time: now },
      {
        from: "system",
        text: "Demo response: this request was not run. When the backend investigation agent lands, follow-ups will be executed here and their tool calls will appear in the tool timeline. Nothing in this reply is agent output.",
        time: now,
      },
    ]);
    setFollowUp("");
  };

  return (
    <main className="min-h-full bg-[#0A0B10] text-[#ECEEF2]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/investigations" className="inline-block py-1 text-sm text-[#8AACF4] hover:underline">
          ← Back to investigations
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8AACF4]">
              Investigation Workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {loading
                ? "Loading…"
                : (investigation
                    ? `Investigation ${investigation.id}`
                    : "Investigation not found")}
            </h1>
            {incident ? (
              <p className="mt-1 text-sm text-[#969CA9]">
                Incident{" "}
                <Link
                  to={`/incidents/${incident.id}`}
                  className="font-medium text-[#ECEEF2] hover:text-[#8AACF4]"
                >
                  {incident.id} · {incident.title}
                </Link>
              </p>
            ) : null}
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(error) ??
              "Could not load this investigation. Please try again."}
          </div>
        ) : null}

        {!loading && !investigation ? (
          <div className="mt-5 rounded-xl border border-[#232833] bg-[#14161D] px-4 py-6">
            <p className="text-sm">
              No investigation with id{" "}
              <span className="font-mono">{investigationId}</span> exists in
              the demo dataset.
            </p>
            <Link
              to="/investigations"
              className="mt-3 inline-block rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm text-[#8AACF4]"
            >
              Back to investigations
            </Link>
          </div>
        ) : null}

        {investigation && incident ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-12">
            {/* Left panel: incident, service, logs, error timeline, chart */}
            <section className="min-w-0 space-y-4 lg:col-span-3" aria-label="Incident details">
              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Incident details</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <SeverityBadge severity={incident.severity} />
                  </p>
                  <p>
                    <span className="text-[#969CA9]">Status: </span>
                    {incident.status}
                  </p>
                  <p>
                    <span className="text-[#969CA9]">Investigation: </span>
                    {incident.investigationStatus}
                  </p>
                  <p>
                    <span className="text-[#969CA9]">Detected: </span>
                    {formatDateTime(incident.detectedAt)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  {incident.description}
                </p>
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Affected service</h2>
                {service ? (
                  <div className="mt-3 text-sm">
                    <Link
                      to={`/services/${service.id}`}
                      className="font-medium hover:text-[#8AACF4]"
                    >
                      {service.name} →
                    </Link>
                    <p className="mt-1 text-[#969CA9]">
                      {providerLabel(service.provider)} · {service.status} ·{" "}
                      {service.errorCount} errors
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 font-mono text-sm text-[#969CA9]">
                    {incident.serviceId}
                  </p>
                )}
                {health.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs text-[#969CA9]">
                      Error rate trend <DemoBadge />
                    </p>
                    <div className="mt-2">
                      <Sparkline
                        values={health.map((point) => point.errorRate)}
                        stroke="#EF4444"
                        label={`Error rate trend for ${serviceName(incident.serviceId)}`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#969CA9]">
                      {health.map((point) => point.errorRate.toFixed(1)).join("% → ")}%
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">
                  Related errors ({errorLogs.length})
                </h2>
                {errorLogs.length === 0 ? (
                  <p className="mt-3 text-sm text-[#969CA9]">
                    No error-level logs in this demo incident.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {errorLogs.map((log) => (
                      <li key={log.id}>
                        <a
                          href={`#log-${log.id}`}
                          className="hover:text-[#8AACF4]"
                        >
                          {formatTime(log.timestamp)} · {log.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Log timeline</h2>
                <div className="mt-3">
                  <LogTimeline logs={logs} serviceName={serviceName} />
                </div>
              </div>
            </section>

            {/* Center panel: progress, tools, hypotheses, evidence, fixes */}
            <section className="min-w-0 space-y-4 lg:col-span-6" aria-label="Investigation">
              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">
                  AI investigation progress <DemoBadge />
                </h2>
                <p className="mt-1 text-xs text-[#969CA9]">
                  Synthetic record only. No agent has executed these steps;
                  they are demo data shaped like a real investigation record.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <StepStatusBadge status={investigation.status === "running" ? "running" : investigation.status === "completed" ? "completed" : investigation.status === "failed" ? "failed" : "pending"} />
                  <span className="text-sm">
                    {completedSteps} of {steps.length} steps completed ({progress}%)
                  </span>
                  <span className="text-xs text-[#969CA9]">
                    Started {formatDateTime(investigation.startedAt)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#232833]">
                  <div
                    className="h-full bg-[#5B8DEF]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Tool execution timeline</h2>
                <div className="mt-3">
                  <ToolTimeline steps={steps} />
                </div>
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Root-cause hypotheses</h2>
                <div className="mt-3 space-y-4">
                  {investigation.hypotheses.map((hypothesis) => {
                    const evidenceLogs = hypothesis.evidenceIds
                      .map((id) => logs.find((log) => log.id === id))
                      .filter((log) => log !== undefined);
                    const missing = hypothesis.evidenceIds.length - evidenceLogs.length;
                    const insufficient =
                      hypothesis.evidenceIds.length === 0 || missing > 0;
                    return (
                      <div
                        key={hypothesis.id}
                        className="rounded-lg border border-[#232833] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{hypothesis.title}</p>
                          <span className="text-sm font-semibold text-[#8AACF4]">
                            {hypothesis.confidence}% confidence
                          </span>
                        </div>
                        {insufficient ? (
                          <p className="mt-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#FBBF24]">
                            Evidence insufficient:{" "}
                            {hypothesis.evidenceIds.length === 0
                              ? "no evidence references are attached to this hypothesis."
                              : `${missing} of ${hypothesis.evidenceIds.length} evidence references could not be resolved.`}{" "}
                            Treat this hypothesis as unproven.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-[#969CA9]">
                            Evidence linked below. Select a reference to jump
                            to that log entry.
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {hypothesis.evidenceIds.map((evidenceId) => (
                            <a
                              key={evidenceId}
                              href={`#log-${evidenceId}`}
                              className="rounded-full border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-2 py-0.5 font-mono text-xs text-[#8AACF4]"
                            >
                              {evidenceId}
                            </a>
                          ))}
                          {evidenceLogs.map((log) => (
                            <p key={log.id} className="w-full text-sm text-[#969CA9]">
                              {log.message}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {investigation.hypotheses.length === 0 ? (
                    <p className="text-sm text-[#969CA9]">
                      No hypotheses recorded yet.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Suggested fixes</h2>
                <div className="mt-3 space-y-4">
                  {investigation.fixes.map((fix) => {
                    const isApproved = approved[fix.id] ?? fix.approved;
                    return (
                      <div
                        key={fix.id}
                        className="rounded-lg border border-[#232833] p-3"
                      >
                        <p className="text-sm font-medium">{fix.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#969CA9]">
                          {fix.description}
                        </p>
                        {fix.diff ? (
                          <div className="mt-3">
                            <DiffViewer diff={fix.diff} />
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[#969CA9]">
                            No code diff was proposed for this fix in the demo
                            record. No source-code reference is available here.
                          </p>
                        )}
                        <p className="mt-3 text-xs text-[#969CA9]">
                          Approval state:{" "}
                          {isApproved ? "approved (demo only)" : "not approved"}.
                          Approvals here are not persisted and apply no code
                          change or deployment.
                        </p>
                      </div>
                    );
                  })}
                  {investigation.fixes.length === 0 ? (
                    <p className="text-sm text-[#969CA9]">
                      No fixes proposed yet.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Right panel: conversation, follow-ups, approvals */}
            <section className="min-w-0 space-y-4 lg:col-span-3" aria-label="Agent conversation and controls">
              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">
                  Agent conversation <DemoBadge />
                </h2>
                <p className="mt-1 text-xs text-[#969CA9]">
                  No live agent is connected in demo mode. Messages below are
                  session-only; the system replies explain that, rather than
                  pretending an agent answered.
                </p>
                <ul className="mt-3 space-y-3">
                  {messages.map((message, index) => (
                    <li
                      key={index}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        message.from === "user"
                          ? "bg-[#5B8DEF]/10 border border-[#5B8DEF]/30"
                          : "bg-white/5 border border-[#232833]"
                      }`}
                    >
                      <p className="text-xs font-medium text-[#969CA9]">
                        {message.from === "user" ? "You" : "System (demo)"} ·{" "}
                        {message.time}
                      </p>
                      <p className="mt-1 leading-relaxed">{message.text}</p>
                    </li>
                  ))}
                </ul>
                <form onSubmit={submitFollowUp} className="mt-4 space-y-2">
                  <label htmlFor="follow-up" className="text-xs font-medium text-[#969CA9]">
                    Follow-up investigation request
                  </label>
                  <textarea
                    id="follow-up"
                    value={followUp}
                    onChange={(event) => setFollowUp(event.target.value)}
                    placeholder="Ask for a follow-up check, for example: check whether the orders service saw the same traces."
                    rows={3}
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-[#5B8DEF]/40 bg-[#5B8DEF]/10 px-3 py-2 text-sm font-medium text-[#8AACF4]"
                  >
                    Send follow-up (demo)
                  </button>
                  <p className="text-xs text-[#969CA9]">
                    Sending records the request in this session only. It does
                    not start a real investigation.
                  </p>
                </form>
              </div>

              <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
                <h2 className="text-sm font-semibold">Approval controls</h2>
                <p className="mt-1 text-xs text-[#969CA9]">
                  Demo only. Approvals are not persisted, and no fix is
                  executed, applied, or deployed from here. Real approvals
                  require the backend developer's approval endpoint.
                </p>
                <ul className="mt-3 space-y-3">
                  {investigation.fixes.map((fix) => {
                    const isApproved = approved[fix.id] ?? fix.approved;
                    return (
                      <li key={fix.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 flex-1">{fix.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setApproved((prev) => ({
                              ...prev,
                              [fix.id]: !isApproved,
                            }))
                          }
                          aria-pressed={isApproved}
                          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
                            isApproved
                              ? "border-[#5B8DEF]/40 bg-[#5B8DEF]/10 text-[#8AACF4]"
                              : "border-[#232833] text-[#969CA9]"
                          }`}
                        >
                          {isApproved ? "Approved (demo)" : "Approve (demo)"}
                        </button>
                      </li>
                    );
                  })}
                  {investigation.fixes.length === 0 ? (
                    <li className="text-sm text-[#969CA9]">
                      No fixes to approve yet.
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

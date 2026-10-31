import type {
  AgentActionStatus,
  LogEntry,
} from "../../../shared/tracemind/models.js";
import { formatDateTime, formatTime } from "@/lib/tracemind/format";
import { DemoBadge } from "./badges";

/**
 * Action outputs carry optional properties as `string | undefined`
 * under exactOptionalPropertyTypes, while the shared models use plain
 * `?: string`. These aliases accept both shapes without touching the
 * shared models or contracts.
 */
type StepLike = Omit<import("../../../shared/tracemind/models.js").AgentAction, "output" | "completedAt"> & {
  output?: string | undefined;
  completedAt?: string | undefined;
};
type LogLike = Omit<LogEntry, "traceId"> & {
  traceId?: string | undefined;
};

const stepStyles: Record<AgentActionStatus, string> = {
  pending: "bg-white/5 text-[#969CA9] border-white/10",
  running: "bg-[#5B8DEF]/15 text-[#8AACF4] border-[#5B8DEF]/30",
  completed: "bg-[#5B8DEF]/15 text-[#8AACF4] border-[#5B8DEF]/30",
  failed: "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
};

export function StepStatusBadge({ status }: { status: AgentActionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${stepStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function ToolTimeline({ steps }: { steps: StepLike[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-[#969CA9]">
        No tool calls recorded for this investigation yet.
      </p>
    );
  }
  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.id} className="border-l-2 border-[#232833] pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium">{step.tool}</span>
            <StepStatusBadge status={step.status} />
            <span className="text-xs text-[#969CA9]">
              {formatDateTime(step.startedAt)}
              {step.completedAt ? ` → ${formatTime(step.completedAt)}` : ""}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#969CA9]">{step.input}</p>
          {step.output ? (
            <p className="mt-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-[#ECEEF2]">
              {step.output}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#969CA9]">
              No output recorded yet for this step.
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

const levelStyles: Record<LogLike["level"], string> = {
  error: "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  warn: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
  info: "bg-white/5 text-[#969CA9] border-white/10",
};

export function LogTimeline({
  logs,
  serviceName,
}: {
  logs: LogLike[];
  serviceName: (serviceId: string) => string;
}) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-[#969CA9]">
        No demo logs exist for this incident yet. Real Cloud Logging data
        will fill this timeline when the backend developer's ingestion
        lands; nothing here is fabricated to fill the gap.
      </p>
    );
  }
  const sorted = [...logs].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  return (
    <ol className="space-y-3">
      {sorted.map((log) => (
        <li
          key={log.id}
          id={`log-${log.id}`}
          className="scroll-mt-24 rounded-lg border border-[#232833] px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${levelStyles[log.level]}`}
            >
              {log.level}
            </span>
            <span className="font-mono text-xs text-[#969CA9]">
              {formatDateTime(log.timestamp)}
            </span>
            <span className="text-xs text-[#969CA9]">
              {serviceName(log.serviceId)}
            </span>
            {log.traceId ? (
              <span className="font-mono text-xs text-[#969CA9]">
                {log.traceId}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">{log.message}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Minimal unified-diff viewer. Lines starting with + are emerald,
 * - are red, @@ headers are muted, everything else is plain. No
 * syntax highlighting library is added for a demo diff.
 */
export function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <div className="overflow-x-auto rounded-lg border border-[#232833] bg-[#14161D]">
      <div className="flex items-center gap-2 border-b border-[#232833] px-3 py-2">
        <DemoBadge />
        <span className="text-xs text-[#969CA9]">
          Demo diff — synthetic, not a real code inspection.
        </span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, index) => {
          const tone = line.startsWith("+") && !line.startsWith("+++")
            ? "text-[#8AACF4]"
            : line.startsWith("-") && !line.startsWith("---")
              ? "text-[#F87171]"
              : line.startsWith("@@")
                ? "text-[#969CA9]"
                : "text-[#ECEEF2]";
          return (
            <div key={index} className={tone}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

import type { ServiceStatus, Severity } from "../../../shared/tracemind/models.js";
import { severityLabel } from "@/lib/tracemind/format";

const severityStyles: Record<Severity, string> = {
  critical: "bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30",
  warning: "bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30",
  info: "bg-white/5 text-[#969CA9] border-white/10",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityStyles[severity]}`}
    >
      {severityLabel(severity)}
    </span>
  );
}

const statusDot: Record<ServiceStatus, string> = {
  healthy: "bg-[#10B981]",
  degraded: "bg-[#F59E0B]",
  down: "bg-[#EF4444]",
  unknown: "bg-[#969CA9]",
};

export function StatusDot({ status }: { status: ServiceStatus }) {
  return (
    <span
      aria-label={status}
      className={`inline-block size-2 shrink-0 rounded-full ${statusDot[status]}`}
    />
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">
      Demo data
    </span>
  );
}

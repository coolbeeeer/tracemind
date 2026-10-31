import { chrome } from "@/components/tracemind/redesign";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border",
        className,
      )}
      style={{
        borderColor: "#3B2A6B",
        backgroundColor: "#1B1430",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        stroke={chrome.brandViolet}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12h3l2-6 3 12 2-8 2 4 2-2 2 2 2-2" />
      </svg>
    </span>
  );
}

/**
 * TraceMind wordmark from the reference header: white "trace", gradient
 * "mind", "OBSERVABILITY" caption. Compact renders the mark alone (for the
 * collapsed sidebar); the full mark never carries a demo persona or a
 * placeholder workspace name.
 */
export function TraceMindWordmark({ compact = false }: { compact?: boolean }) {
  if (compact) return <LogoMark className="size-8" />;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <LogoMark className="size-9" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[17px] font-semibold tracking-tight text-white">
          trace
          <span
            style={{
              backgroundImage: `linear-gradient(90deg, ${chrome.brandViolet}, ${chrome.brandPink})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            mind
          </span>
        </span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-[#8A91A3]">
          Observability
        </span>
      </span>
    </span>
  );
}

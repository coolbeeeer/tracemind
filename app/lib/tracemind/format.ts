/** Small, pure formatting helpers for TraceMind pages. No data, no I/O. */

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function providerLabel(provider: string): string {
  switch (provider) {
    case "gcp-run":
      return "Google Cloud Run";
    case "github":
      return "GitHub";
    case "aws":
      return "AWS";
    default:
      return "Other";
  }
}

export function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

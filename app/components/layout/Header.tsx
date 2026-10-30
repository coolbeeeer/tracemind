import {
  useHeaderTitle,
  useHeaderActions,
} from "@agent-native/toolkit/app-shell";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";
import { openCommandMenu } from "@agent-native/toolkit/app/shared";
import { IconSearch } from "@tabler/icons-react";
import { useLocation } from "react-router";

import { MobileAppBar } from "./MobileAppBar";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}
const routeNames: Record<string, string> = {
  overview: "Overview",
  services: "Services",
  incidents: "Incidents",
  investigations: "Investigations",
  logs: "Logs",
  integrations: "Integrations",
  "agent-activity": "Agent activity",
  "tracemind-settings": "Settings",
};
export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const title = useHeaderTitle();
  const actions = useHeaderActions();
  const { pathname } = useLocation();
  const route = routeNames[pathname.split("/")[1] ?? ""] ?? "TraceMind";
  return (
    <MobileAppBar
      className="md:px-7 h-14"
      onOpenNavigation={onOpenMobileSidebar}
      title={
        title ?? (
          <span className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Workspace
            </span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <span className="text-xs">{route}</span>
          </span>
        )
      }
      actions={
        <>
          <button
            type="button"
            onClick={openCommandMenu}
            className="mr-3 hidden h-8 items-center gap-3 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 md:flex"
            aria-label="Search workspace"
          >
            <IconSearch className="size-4" />
            <span className="pr-10">Search anything…</span>
            <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
              ⌘ K
            </kbd>
          </button>
          {actions}
          <AgentToggleButton />
        </>
      }
    />
  );
}

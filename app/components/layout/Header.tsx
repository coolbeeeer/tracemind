import { useT } from "@agent-native/core/client/i18n";
import {
  useHeaderTitle,
  useHeaderActions,
} from "@agent-native/toolkit/app-shell";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";
import { openCommandMenu } from "@agent-native/toolkit/app/shared";
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
  IconSearch,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { chrome } from "@/components/tracemind/redesign";

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

/**
 * Reference-style header: breadcrumb on the left, search pill, environment
 * pill, and an incidents bell on the right, all on the same near-black
 * chrome as the sidebar. The divider is an inline style, not the `border-b`
 * class: the framework shell forces `header/div.border-b` to a transparent
 * bottom border on desktop, which is why the hairline was invisible.
 * Every control is real: search opens the command menu, the environment
 * menu's only action is the real Integrations page, and the bell links to
 * the real Incidents list. There is no unread-dot
 * on the bell and no account avatar here: the app has no notifications
 * feed, and the account switcher already lives in the sidebar footer, so
 * neither is faked to match the mockup's placeholder persona.
 */
function ProductionMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm text-white transition-colors hover:brightness-125"
        style={{
          backgroundColor: chrome.searchBg,
          borderColor: chrome.searchBorder,
        }}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: "#10B981" }}
        />
        <span>Production</span>
        <IconChevronDown className="size-4 text-[#8A91A3]" strokeWidth={1.8} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close environment menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-1.5 shadow-xl"
            style={{
              backgroundColor: chrome.searchBg,
              borderColor: chrome.searchBorder,
            }}
          >
            <div
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: "#10B981" }}
              />
              <span className="flex-1">Production</span>
              <IconCheck className="size-4 text-[#8A91A3]" strokeWidth={1.8} />
            </div>
            <div
              className="my-1 border-t"
              style={{ borderColor: chrome.searchBorder }}
            />
            <Link
              to="/integrations"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
            >
              Manage connections
              <span className="mt-0.5 block text-xs text-[#8A91A3]">
                Live connections are managed in Integrations.
              </span>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const t = useT();
  const title = useHeaderTitle();
  const actions = useHeaderActions();
  const { pathname } = useLocation();
  const route = routeNames[pathname.split("/")[1] ?? ""] ?? "TraceMind";
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4 md:px-6"
      style={{
        backgroundColor: chrome.bg,
        borderBottom: `1px solid ${chrome.border}`,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onOpenMobileSidebar}
        aria-label={t("navigation.openNavigation")}
      >
        <IconMenu2 className="size-4" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center truncate text-sm font-medium">
        {title ?? (
          <span className="flex items-center gap-2">
            <span className="hidden text-sm text-[#8A91A3] sm:inline">
              Workspace
            </span>
            <IconChevronRight
              aria-hidden="true"
              className="hidden size-4 text-[#8A91A3] sm:inline"
              strokeWidth={1.8}
            />
            <span className="text-sm font-semibold text-white">{route}</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openCommandMenu}
          className="hidden h-9 items-center gap-3 rounded-lg border px-3 text-sm text-[#8A91A3] transition-colors hover:brightness-125 md:flex"
          style={{
            backgroundColor: chrome.searchBg,
            borderColor: chrome.searchBorder,
          }}
          aria-label="Search workspace"
        >
          <IconSearch className="size-4" strokeWidth={1.8} />
          <span className="pr-10">Search anything…</span>
          <kbd
            className="rounded border px-1.5 py-0.5 text-[10px]"
            style={{ borderColor: chrome.searchBorder }}
          >
            ⌘ K
          </kbd>
        </button>
        <ProductionMenu />
        <Link
          to="/incidents"
          aria-label="View incidents"
          className="hidden size-9 items-center justify-center rounded-lg text-[#8A91A3] transition-colors hover:bg-white/5 hover:text-white sm:flex"
        >
          <IconBell className="size-5" strokeWidth={1.8} />
        </Link>
        {actions}
        <AgentToggleButton />
      </div>
    </header>
  );
}

import {
  useHeaderTitle,
  useHeaderActions,
} from "@agent-native/toolkit/app-shell";
import { AgentToggleButton } from "@agent-native/toolkit/app/chat";

import { MobileAppBar } from "./MobileAppBar";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const title = useHeaderTitle();
  const actions = useHeaderActions();

  // TraceMind pages get the redesign's navy header with the brand mark,
  // instead of the template's gray bar with an empty title: that empty
  // gray bar is what read as stock template chrome on phones.
  return (
    <MobileAppBar
      className="border-[#1E2A44] bg-[#070B16] text-[#E8EDF7] md:ps-4"
      onOpenNavigation={onOpenMobileSidebar}
      title={
        title ?? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-2 shrink-0 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]"
            />
            <span className="font-semibold tracking-tight">TraceMind</span>
          </span>
        )
      }
      actions={
        <>
          {actions}
          <AgentToggleButton />
        </>
      }
    />
  );
}

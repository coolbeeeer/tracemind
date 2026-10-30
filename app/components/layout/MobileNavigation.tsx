import {
  IconLayoutDashboard,
  IconServer,
  IconAlertTriangle,
  IconMessageCircle,
} from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
const destinations = [
  { to: "/overview", label: "Overview", Icon: IconLayoutDashboard },
  { to: "/services", label: "Services", Icon: IconServer },
  { to: "/incidents", label: "Incidents", Icon: IconAlertTriangle },
  { to: "/chat", label: "Chat", Icon: IconMessageCircle },
];
export function MobileNavigation() {
  const { pathname } = useLocation();
  return (
    <nav className="tm-mobile-nav" aria-label="Quick navigation">
      {destinations.map(({ to, label, Icon }) => (
        <Link
          key={to}
          to={to}
          aria-current={pathname.startsWith(to) ? "page" : undefined}
        >
          <Icon className="size-5" strokeWidth={1.6} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

import { Home, ScrollText, UserRoundPlus, ScanLine, CalendarPlus, UploadCloud, AreaChart } from "lucide-react";

export const navLinks = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/logs",
    label: "Logs",
    icon: ScrollText,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/register-visitor",
    label: "Register Visitor",
    icon: UserRoundPlus,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/scan",
    label: "Scan QR Code",
    icon: ScanLine,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/pre-register-visitor",
    label: "Pre-register",
    icon: CalendarPlus,
    roles: ["admin", "host"],
  },
  {
    href: "/app/bulk-visitor-upload",
    label: "Bulk Upload",
    icon: UploadCloud,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: AreaChart,
    roles: ["admin"],
  },
];


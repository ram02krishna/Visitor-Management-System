import { Users, ClipboardList, User, Download, TrendingUp, Camera, Clock } from "lucide-react";

export const navLinks = [
  {
    href: "/app/users",
    label: "Users",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/app/logs",
    label: "Logs",
    icon: ClipboardList,
    roles: ["admin"],
  },
  {
    href: "/app/pre-register-visitor",
    label: "Pre-register",
    icon: User,
    roles: ["admin", "host"],
  },
  {
    href: "/app/register-visitor",
    label: "Register Visitor",
    icon: User,
    roles: ["guard"],
  },
  {
    href: "/app/scan",
    label: "Scan QR Code",
    icon: Camera,
    roles: ["guard"],
  },
  {
    href: "/app/ongoing-visits",
    label: "Ongoing Visits",
    icon: Clock,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/bulk-visitor-upload",
    label: "Bulk Upload",
    icon: Users,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: TrendingUp,
    roles: ["admin"],
  },
  {
    href: "/app/export",
    label: "Export",
    icon: Download,
    roles: ["admin"],
  },
];

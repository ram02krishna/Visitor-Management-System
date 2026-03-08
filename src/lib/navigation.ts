import { LayoutDashboard, ClipboardList, User, TrendingUp, Camera, Users, UserPlus } from "lucide-react";

export const navLinks = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/logs",
    label: "Logs",
    icon: ClipboardList,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/register-visitor",
    label: "Register Visitor",
    icon: UserPlus,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/scan",
    label: "Scan QR Code",
    icon: Camera,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/pre-register-visitor",
    label: "Pre-register",
    icon: User,
    roles: ["admin", "host"],
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
];


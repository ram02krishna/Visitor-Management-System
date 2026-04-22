import { Home, UserRoundPlus, ScanLine, UploadCloud, Lock, ScrollText, UserMinus } from "lucide-react";

export const navLinks = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["admin", "host", "guard", "visitor"],
  },
  {
    href: "/app/logs",
    label: "Visit Logs",
    icon: ScrollText,
    roles: ["admin", "host", "guard", "visitor"],
  },
  {
    href: "/app/register-visit",
    label: "Register Visit",
    icon: UserRoundPlus,
    roles: ["admin", "host", "guard", "visitor"],
  },
  {
    href: "/app/scan",
    label: "Scan QR Code",
    icon: ScanLine,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/blacklist",
    label: "Blacklist Users",
    icon: UserMinus,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/bulk-visitor-upload",
    label: "Bulk Upload",
    icon: UploadCloud,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/change-password",
    label: "Change Password",
    icon: Lock,
    roles: ["admin", "host", "guard", "visitor"],
  },
];

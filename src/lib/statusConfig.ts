import {
  Hourglass,
  CheckCircle2,
  XCircle,
  LogIn,
} from "lucide-react";

/**
 * Centralized status configuration for consistency across the app
 * Used in Dashboard, VisitLogs, ScanQrCode, and other components
 */
export const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Hourglass,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  denied: {
    label: "Denied",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  "checked-in": {
    label: "Checked In",
    icon: LogIn,
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

/**
 * Get status config or fallback to pending if not found
 * @param status - Status string to look up
 * @returns Status configuration object
 */
export function getStatusConfig(
  status: string
): (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] {
  return STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
}

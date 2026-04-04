import React from "react";
import { Zap, ArrowUpRight } from "lucide-react";

export type StatItemProps = {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  status?: string;
  onClick: (status: string) => void;
  style?: React.CSSProperties;
  className?: string;
};

// Rich per-card theme: gradient, glow, blob, border accent
const CARD_THEMES: Record<string, {
  gradient: string;
  glow: string;
  blob: string;
  accent: string;
  badge: string;
}> = {
  "text-blue-500": {
    gradient: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/30",
    blob: "bg-blue-400/10",
    accent: "from-blue-500 to-indigo-600",
    badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
  },
  "text-green-500": {
    gradient: "from-emerald-500 to-green-600",
    glow: "shadow-emerald-500/30",
    blob: "bg-emerald-400/10",
    accent: "from-emerald-500 to-green-600",
    badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
  },
  "text-yellow-500": {
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/30",
    blob: "bg-amber-400/10",
    accent: "from-amber-500 to-orange-500",
    badge: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300",
  },
  "text-indigo-500": {
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
    blob: "bg-violet-400/10",
    accent: "from-violet-500 to-purple-600",
    badge: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300",
  },
  "text-red-500": {
    gradient: "from-rose-500 to-red-600",
    glow: "shadow-rose-500/30",
    blob: "bg-rose-400/10",
    accent: "from-rose-500 to-red-600",
    badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
  },
  // fallback
  default: {
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/30",
    blob: "bg-sky-400/10",
    accent: "from-sky-500 to-blue-600",
    badge: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300",
  },
};

export const StatItem = React.memo(
  ({ name, value, icon: Icon, color, status, onClick, style, className }: StatItemProps) => {
    const theme = CARD_THEMES[color] ?? CARD_THEMES.default;

    return (
      <div
        className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group animate-fadeInUp overflow-hidden border border-gray-100/80 dark:border-slate-800 ${
          status ? "cursor-pointer" : ""
        } ${className || ""}`}
        style={style}
        onClick={() => status && onClick(status)}
        aria-label={status ? `View ${name.toLowerCase()}` : undefined}
        tabIndex={status ? 0 : undefined}
      >
        {/* Decorative blob in top-right */}
        <div
          className={`absolute -top-6 -right-6 w-28 h-28 rounded-full ${theme.blob} blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80`}
        />

        {/* Subtle full-card gradient wash on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`}
        />

        <div className="p-6 relative z-10">
          {/* Top row: icon + arrow */}
          <div className="flex items-start justify-between">
            <div
              className={`p-3.5 rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-lg ${theme.glow} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
            >
              <Icon className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            {status && (
              <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${theme.badge}`}
                >
                  View <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>

          {/* Value + label */}
          <div className="mt-5">
            <p className="text-[2.4rem] font-black tracking-tight text-gray-900 dark:text-white leading-none tabular-nums">
              {value}
            </p>
            <h3 className="mt-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 tracking-wide uppercase">
              {name}
            </h3>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800/60 relative z-10 flex items-center gap-1.5">
          <Zap className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Today&apos;s Metric</span>
        </div>

        {/* Bottom gradient accent bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${theme.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
        />
      </div>
    );
  }
);

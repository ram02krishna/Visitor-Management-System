import React from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";

export type StatItemProps = {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  status?: string;
  onClick: (status: string) => void;
  onMouseEnter?: (status: string) => void;
  style?: React.CSSProperties;
  className?: string;
};

const CARD_THEMES: Record<
  string,
  {
    gradient: string;
    glow: string;
    blob: string;
    accent: string;
    badge: string;
    hoverGlow: string;
  }
> = {
  "text-blue-500": {
    gradient: "from-blue-500 to-indigo-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(59,130,246,0.6)]",
    blob: "bg-blue-400/10",
    accent: "from-blue-500 to-indigo-600",
    badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(59,130,246,0.2)]",
  },
  "text-green-500": {
    gradient: "from-emerald-500 to-green-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(16,185,129,0.6)]",
    blob: "bg-emerald-400/10",
    accent: "from-emerald-500 to-green-600",
    badge: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.2)]",
  },
  "text-yellow-500": {
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-[0_12px_28px_-6px_rgba(249,115,22,0.6)]",
    blob: "bg-amber-400/10",
    accent: "from-amber-500 to-orange-500",
    badge: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(249,115,22,0.2)]",
  },
  "text-indigo-500": {
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(168,85,247,0.6)]",
    blob: "bg-violet-400/10",
    accent: "from-violet-500 to-purple-600",
    badge: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(168,85,247,0.2)]",
  },
  "text-rose-500": {
    gradient: "from-rose-500 to-red-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(239,68,68,0.6)]",
    blob: "bg-rose-400/10",
    accent: "from-rose-500 to-red-600",
    badge: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(239,68,68,0.2)]",
  },
  "text-teal-500": {
    gradient: "from-teal-500 to-emerald-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(20,184,166,0.6)]",
    blob: "bg-teal-400/10",
    accent: "from-teal-500 to-emerald-600",
    badge: "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(20,184,166,0.2)]",
  },
  default: {
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-[0_12px_28px_-6px_rgba(14,165,233,0.6)]",
    blob: "bg-sky-400/10",
    accent: "from-sky-500 to-blue-600",
    badge: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.2)]",
  },
};

export const StatItem = React.memo(
  ({
    name,
    value,
    icon: Icon,
    color,
    status,
    onClick,
    onMouseEnter,
    style,
    className,
  }: StatItemProps) => {
    const theme = CARD_THEMES[color] ?? CARD_THEMES.default;

    return (
      <div
        className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden group relative flex flex-col transition-all duration-300 shadow-xs ${
          status ? "cursor-pointer" : ""
        } ${theme.hoverGlow} ${className || ""}`}
        style={style}
        onClick={() => status && onClick(status)}
        onMouseEnter={() => status && onMouseEnter && onMouseEnter(status)}
        aria-label={status ? `View ${name.toLowerCase()}` : undefined}
        tabIndex={status ? 0 : undefined}
      >
        <div className="p-4 sm:p-5 relative z-10 flex-1 flex flex-col bg-white dark:bg-slate-900 transition-colors duration-300">
          <div className="flex items-start justify-between">
            <div
              className={`p-3 sm:p-3.5 rounded-xl bg-gradient-to-br ${theme.gradient} ${theme.glow} transition-all duration-300`}
            >
              <Icon
                className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </div>
            {status && (
              <div className="transition-all duration-300">
                <div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${theme.badge}`}
                >
                  View <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                </div>
              </div>
            )}
          </div>
          <div className="mt-auto pt-6 sm:pt-8">
            <p className="text-3xl sm:text-[2.5rem] font-bold tracking-tight text-slate-800 dark:text-white leading-none tabular-nums">
              {value}
            </p>
            <h3 className="mt-2 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
              {name}
            </h3>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 relative z-10 flex items-center gap-2">
          <TrendingUp className={`h-3.5 w-3.5 ${color}`} strokeWidth={2.5} />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Live Metric
          </span>
        </div>

        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-0 group-hover:w-full bg-gradient-to-r ${theme.gradient} rounded-t-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20`} />
      </div>
    );
  }
);

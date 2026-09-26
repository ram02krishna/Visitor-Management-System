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
    iconBadge: string;
    viewPill: string;
    hoverGlow: string;
  }
> = {
  "text-blue-500": {
    gradient: "from-blue-500 to-indigo-600",
    iconBadge:
      "bg-blue-50 text-blue-600 border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30 dark:shadow-[0_0_15px_-2px_rgba(59,130,246,0.3)]",
    viewPill:
      "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 hover:dark:bg-blue-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(59,130,246,0.2)]",
  },
  "text-green-500": {
    gradient: "from-emerald-500 to-green-600",
    iconBadge:
      "bg-emerald-50 text-emerald-600 border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_15px_-2px_rgba(16,185,129,0.3)]",
    viewPill:
      "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 hover:dark:bg-emerald-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.2)]",
  },
  "text-yellow-500": {
    gradient: "from-amber-500 to-orange-500",
    iconBadge:
      "bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 dark:shadow-[0_0_15px_-2px_rgba(245,158,11,0.3)]",
    viewPill:
      "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 hover:dark:bg-amber-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(249,115,22,0.2)]",
  },
  "text-indigo-500": {
    gradient: "from-violet-500 to-purple-600",
    iconBadge:
      "bg-indigo-50 text-indigo-600 border-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30 dark:shadow-[0_0_15px_-2px_rgba(99,102,241,0.3)]",
    viewPill:
      "bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 hover:dark:bg-indigo-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(168,85,247,0.2)]",
  },
  "text-rose-500": {
    gradient: "from-rose-500 to-red-600",
    iconBadge:
      "bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_15px_-2px_rgba(244,63,94,0.3)]",
    viewPill:
      "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 hover:dark:bg-rose-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(239,68,68,0.2)]",
  },
  "text-teal-500": {
    gradient: "from-teal-500 to-emerald-600",
    iconBadge:
      "bg-teal-50 text-teal-600 border-teal-200/70 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30 dark:shadow-[0_0_15px_-2px_rgba(20,184,166,0.3)]",
    viewPill:
      "bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30 hover:dark:bg-teal-500/25",
    hoverGlow: "hover:shadow-[0_16px_40px_-12px_rgba(20,184,166,0.2)]",
  },
  default: {
    gradient: "from-sky-500 to-blue-600",
    iconBadge:
      "bg-sky-50 text-sky-600 border-sky-200/70 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 dark:shadow-[0_0_15px_-2px_rgba(14,165,233,0.3)]",
    viewPill:
      "bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30 hover:dark:bg-sky-500/25",
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
              className={`p-2.5 sm:p-3 rounded-xl border ${theme.iconBadge} transition-all duration-300 group-hover:scale-105 shadow-xs`}
            >
              <Icon
                className="h-5 w-5 sm:h-6 sm:w-6"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </div>
            {status && (
              <div className="transition-all duration-300">
                <div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${theme.viewPill} transition-all duration-200`}
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
          <TrendingUp className={`h-3.5 w-3.5 ${color} dark:brightness-125`} strokeWidth={2.5} />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Live Metric
          </span>
        </div>

        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-0 group-hover:w-full bg-gradient-to-r ${theme.gradient} rounded-t-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20`} />
      </div>
    );
  }
);

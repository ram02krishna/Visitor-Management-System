import React from "react";
import { TrendingUp, ArrowRight } from "lucide-react";

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

export const StatItem = React.memo(
  ({ name, value, icon: Icon, color, status, onClick, style, className }: StatItemProps) => {
    // Map colors to gradient backgrounds
    const getGradientClass = () => {
      if (color.includes("green")) return "from-emerald-500 to-green-600";
      if (color.includes("yellow")) return "from-amber-500 to-orange-600";
      if (color.includes("indigo")) return "from-indigo-500 to-purple-600";
      if (color.includes("red")) return "from-red-500 to-rose-600";
      return "from-sky-500 to-blue-600";
    };

    const gradientClass = getGradientClass();

    return (
      <div
        key={name}
        className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 group animate-fadeInUp overflow-hidden border border-gray-100/50 dark:border-slate-800 ${status ? "cursor-pointer" : ""
          } ${className || ""}`}
        style={style}
        onClick={() => status && onClick(status)}
        aria-label={status ? `View ${name.toLowerCase()}` : undefined}
        tabIndex={status ? 0 : undefined}
      >
        {/* Subtle hover background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-lg shadow-${color.split('-')[1]}/30 transition-transform duration-300 group-hover:scale-110`}>
              <Icon className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            {status && (
              <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <div className={`flex items-center text-xs font-semibold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
                  View <ArrowRight className={`ml-1 h-3 w-3 text-${color.split('-')[1]}`} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 tracking-wide uppercase">{name}</h3>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 animate-countUp">
              {value}
            </p>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 relative z-10 flex justify-between items-center">
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            <span>All-time Total</span>
          </div>
        </div>

        {/* Bottom accent bar that expands on hover */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass} transition-transform duration-500 group-hover:scale-x-100 scale-x-0 origin-left`} />
      </div>
    );
  }
);

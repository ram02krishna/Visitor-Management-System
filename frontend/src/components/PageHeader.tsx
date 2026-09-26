import React from "react";
import { BackButton } from "./BackButton";

export interface PageHeaderProps {
  icon: React.ElementType;
  gradient: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  badge?: React.ReactNode;
  backTo?: string | number;
  className?: string;
}

function getHeaderIconStyle(gradient: string) {
  const g = gradient.toLowerCase();
  if (g.includes("indigo") || g.includes("purple") || g.includes("violet")) {
    return "bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30 dark:shadow-[0_0_16px_-2px_rgba(168,85,247,0.3)]";
  }
  if (g.includes("emerald") || g.includes("teal") || g.includes("green")) {
    return "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_16px_-2px_rgba(16,185,129,0.3)]";
  }
  if (g.includes("amber") || g.includes("orange") || g.includes("yellow")) {
    return "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 dark:shadow-[0_0_16px_-2px_rgba(245,158,11,0.3)]";
  }
  if (g.includes("rose") || g.includes("red")) {
    return "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_16px_-2px_rgba(244,63,94,0.3)]";
  }
  if (g.includes("cyan")) {
    return "bg-cyan-50 text-cyan-600 border-cyan-200/60 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30 dark:shadow-[0_0_16px_-2px_rgba(6,182,212,0.3)]";
  }
  return "bg-sky-50 text-sky-600 border-sky-200/60 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 dark:shadow-[0_0_16px_-2px_rgba(14,165,233,0.3)]";
}

export function PageHeader({
  icon: Icon,
  gradient,
  title,
  description,
  right,
  badge,
  backTo,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {backTo !== undefined && (
        <BackButton to={backTo} className="mb-3 sm:mb-4 flex items-center gap-2.5" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border ${getHeaderIconStyle(
              gradient
            )} shrink-0 shadow-xs`}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 leading-relaxed tracking-normal">
                {description}
              </p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0 w-full sm:w-auto flex items-center gap-2.5 sm:ml-4">{right}</div>}
      </div>
    </div>
  );
}

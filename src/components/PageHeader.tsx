import React from "react";

/**
 * PageHeader — shared page title component used across the entire app.
 *
 * Usage:
 *   <PageHeader
 *     icon={ScrollText}
 *     gradient="from-emerald-500 to-green-600"
 *     title="Visit Logs"
 *     description="A complete list of all campus visits."
 *     right={<SearchBar />}          // optional right slot (search, buttons…)
 *     badge={<CountBadge />}          // optional badge next to the title
 *   />
 *
 * All pages must use this component so any global style change (spacing,
 * icon size, heading size, dark-mode, etc.) is applied everywhere at once.
 */
export interface PageHeaderProps {
  /** Lucide icon component */
  icon: React.ElementType;
  /** Tailwind gradient classes, e.g. "from-emerald-500 to-green-600" */
  gradient: string;
  /** Page / section title */
  title: string;
  /** Optional subtitle below the title */
  description?: string;
  /** Optional element rendered to the right of the title block (search bar, buttons…) */
  right?: React.ReactNode;
  /** Optional inline badge rendered next to the title (count pills, status chips…) */
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  gradient,
  title,
  description,
  right,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 ${className}`}
    >
      {/* ─── Left: icon + title block ─── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Gradient icon badge */}
        <div
          className={`p-2.5 bg-gradient-to-br ${gradient} rounded-xl shadow-lg shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-3`}
        >
          <Icon className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>

        {/* Title + optional badge + description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ─── Right slot ─── */}
      {right && (
        <div className="shrink-0 w-full sm:w-auto sm:ml-4">{right}</div>
      )}
    </div>
  );
}

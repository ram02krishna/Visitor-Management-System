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
            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br ${gradient} rounded-2xl shadow-sm shrink-0`}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={2.2} aria-hidden="true" />
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

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  badgeOnly?: boolean;
}

export const LogoBadge = React.memo(({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center justify-center font-bold text-xs tracking-wider uppercase text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded ${className}`}
  >
    VMS
  </span>
));

LogoBadge.displayName = "LogoBadge";

export const Logo = React.memo(({
  size = "md",
  showText = true,
  className = "",
  badgeOnly = false,
}: LogoProps) => {
  const sizeMap = {
    sm: { title: "text-sm", tag: "text-[10px]" },
    md: { title: "text-base", tag: "text-xs" },
    lg: { title: "text-lg", tag: "text-xs" },
    xl: { title: "text-xl", tag: "text-sm" },
  };

  const currentSize = sizeMap[size];

  if (badgeOnly) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold tracking-wider uppercase text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded text-xs select-none ${className}`}
      >
        VMS
      </span>
    );
  }

  return (
    <div className={`flex items-baseline gap-2 select-none ${className}`}>
      <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${currentSize.title}`}>
        IIIT Nagpur
      </span>
      {showText && (
        <span className={`font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 ${currentSize.tag}`}>
          VMS
        </span>
      )}
    </div>
  );
});

Logo.displayName = "Logo";

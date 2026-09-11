export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={`grid grid-cols-2 ${
        count === 5 ? "sm:grid-cols-5" : count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
      } gap-3 sm:gap-4`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between h-28 sm:h-32"
        >
          <div className="flex items-center justify-between">
            <div className="skeleton h-3 w-20 rounded-md" />
            <div className="skeleton h-7 w-7 rounded-xl" />
          </div>
          <div>
            <div className="skeleton h-7 w-16 rounded-md mb-2" />
            <div className="skeleton h-2.5 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-8 w-28 rounded-xl" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="skeleton h-4 rounded-md"
                style={{ width: `${Math.max(30, 80 - c * 10)}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-32 rounded-md" />
                <div className="skeleton h-3 w-20 rounded-md" />
              </div>
            </div>
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="skeleton h-3.5 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  );
}

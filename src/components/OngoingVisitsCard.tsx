import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Activity, Zap, ArrowUpRight } from "lucide-react";
import React from "react";
import { useAuthStore } from "../store/auth";

interface OngoingVisitsCardProps {
  className?: string;
  style?: React.CSSProperties;
  onClick: (status: string) => void;
}

export function OngoingVisitsCard({ className, style, onClick }: OngoingVisitsCardProps) {
  const { user } = useAuthStore();
  const [ongoingVisitsCount, setOngoingVisitsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOngoingVisitsCount = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("status", "checked-in");

    if (user?.role === "host") {
      query = query.eq("host_id", user.id);
    }

    const { count, error } = await query;
    if (!error) setOngoingVisitsCount(count || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {

    fetchOngoingVisitsCount();
    const channel = supabase
      .channel("ongoing_visits_card")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchOngoingVisitsCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOngoingVisitsCount]);

  const isLive = ongoingVisitsCount > 0;

  return (
    <div
      onClick={() => onClick("checked-in")}
      className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group animate-fadeInUp overflow-hidden border border-gray-100/80 dark:border-slate-800 cursor-pointer ${className || ""}`}
      style={style}
      aria-label="View ongoing visits"
      tabIndex={0}
    >

      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-sky-400/10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80" />

      <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-cyan-600 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />

      <div className="p-6 relative z-10">
        {/* Top row: icon + live badge / arrow */}
        <div className="flex items-start justify-between">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Activity className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>

          <div className="flex items-center gap-2">

            {isLive && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 text-[11px] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                Live
              </span>
            )}
            {/* View arrow - reveals on hover */}
            <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 text-xs font-bold">
                View <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Value + label */}
        <div className="mt-5">
          <p className="text-[2.4rem] font-black tracking-tight text-gray-900 dark:text-white leading-none tabular-nums">
            {loading ? <span className="opacity-40">—</span> : ongoingVisitsCount}
          </p>
          <h3 className="mt-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 tracking-wide uppercase">
            Ongoing Visits
          </h3>
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800/60 relative z-10 flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-sky-500" />
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Today&apos;s Metric</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 to-cyan-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </div>
  );
}

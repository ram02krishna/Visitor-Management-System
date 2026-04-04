"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Users, Clock, CheckCircle, Calendar, AreaChart } from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";

type AnalyticsData = {
  total_visits: number;
  total_visitors: number;
  avg_visit_duration: string;
  approval_rate: number;
  denial_rate: number;
  today_visits: number;
  week_visits: number;
  month_visits: number;
  top_purposes: Array<{ purpose: string; count: number }>;
  daily_stats: Array<{ date: string; count: number }>;
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("departments").select("id, name");
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("get_analytics", {
          p_date_range: dateRange,
          p_department_id: departmentFilter,
          p_status: statusFilter,
        })
        .single<AnalyticsData>();

      if (error) {
        console.error("Failed to fetch analytics:", error);
        throw error;
      }

      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchDepartments();
    fetchAnalytics();
  }, [fetchDepartments, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <div className="animate-pulse text-gray-600 dark:text-gray-300">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">Failed to load analytics data.</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <BackButton />

      <PageHeader
        icon={AreaChart}
        gradient="from-purple-500 to-indigo-600"
        title="Analytics Dashboard"
        description="Comprehensive insights into your visitor management system."
        right={
          <div className="flex flex-wrap gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select
              value={departmentFilter || ""}
              onChange={(e) => setDepartmentFilter(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="checked-in">Checked-in</option>
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-800 overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-sky-400/10 blur-xl" />
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
                <Calendar className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2.5 py-1 rounded-full">All Time</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{analytics.total_visits}</p>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Total Visits</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 to-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </div>

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-800 overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-purple-400/10 blur-xl" />
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                <Users className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-1 rounded-full">Unique</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{analytics.total_visitors}</p>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Total Visitors</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </div>

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-800 overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-emerald-400/10 blur-xl" />
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                <CheckCircle className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">Rate</span>
            </div>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{analytics.approval_rate}%</p>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Approval Rate</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-green-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </div>

        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-800 overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-orange-400/10 blur-xl" />
          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                <Clock className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-full">Avg</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{analytics.avg_visit_duration}</p>
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Avg. Duration</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 to-amber-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily Visit Trends</h2>
          <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            Last {dateRange} days
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="relative flex items-end gap-2 h-52 min-w-0" style={{ minWidth: `${analytics.daily_stats.length * 40}px` }}>

            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-slate-800"
                style={{ bottom: `${pct}%` }}
              />
            ))}
            {(() => {
              const maxCount = Math.max(...analytics.daily_stats.map((s) => s.count), 1);
              return analytics.daily_stats.map((stat, index) => {
                const heightPct = stat.count > 0 ? Math.max((stat.count / maxCount) * 100, 4) : 0;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 gap-1 group relative z-10">
                    <span className={`text-xs font-bold transition-all duration-200 ${stat.count > 0 ? "text-gray-700 dark:text-slate-300 opacity-0 group-hover:opacity-100" : "opacity-0"}`}>
                      {stat.count}
                    </span>
                    <div className="w-full flex items-end" style={{ height: "160px" }}>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 via-sky-400 to-blue-400 dark:from-sky-500 dark:via-sky-400 dark:to-blue-300 hover:from-sky-700 hover:to-blue-500 transition-all duration-300 cursor-default group-hover:opacity-90 shadow-sm"
                        style={{ height: `${heightPct}%`, minHeight: stat.count > 0 ? "4px" : "0" }}
                        title={`${stat.date}: ${stat.count} visits`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 text-center w-full truncate leading-tight mt-1">
                      {stat.date}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">0</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              Max: {Math.max(...analytics.daily_stats.map((s) => s.count), 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Top Visit Purposes</h2>
        <div className="space-y-3">
          {analytics.top_purposes.map((item, index) => {
            const rankColors = [
              "from-amber-400 to-orange-500",
              "from-slate-400 to-slate-500",
              "from-orange-400 to-amber-600",
            ];
            const maxCount = Math.max(...analytics.top_purposes.map((p) => p.count));
            const widthPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-xs bg-gradient-to-br ${rankColors[index] ?? "from-sky-500 to-blue-600"} shadow-sm`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.purpose}</span>
                  </div>
                  <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{item.count}</span>
                </div>

                <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

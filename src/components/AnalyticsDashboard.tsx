"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TrendingUp, Users, Clock, CheckCircle, Calendar } from "lucide-react";
import { BackButton } from "./BackButton";

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

      <div className="sm:flex sm:items-center justify-between mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Comprehensive insights into your visitor management system
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Visits</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.total_visits}
              </p>
            </div>
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-sky-600 dark:text-sky-400" strokeWidth={2} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Total Visitors
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.total_visitors}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" strokeWidth={2} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Approval Rate</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {analytics.approval_rate}%
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Avg. Duration</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {analytics.avg_visit_duration}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Stats Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Daily Visit Trends
        </h2>
        <div className="overflow-x-auto">
          <div className="flex items-end gap-2 h-52 min-w-0" style={{ minWidth: `${analytics.daily_stats.length * 40}px` }}>
            {(() => {
              const maxCount = Math.max(...analytics.daily_stats.map((s) => s.count), 1);
              return analytics.daily_stats.map((stat, index) => {
                const heightPct = stat.count > 0 ? Math.max((stat.count / maxCount) * 100, 4) : 0;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 gap-1 group">
                    {/* Count label above bar */}
                    <span className={`text-xs font-bold transition-opacity duration-200 ${stat.count > 0 ? "text-gray-700 dark:text-slate-300 opacity-0 group-hover:opacity-100" : "opacity-0"}`}>
                      {stat.count}
                    </span>
                    {/* Bar */}
                    <div className="w-full flex items-end" style={{ height: "160px" }}>
                      <div
                        className="w-full bg-gradient-to-t from-sky-600 to-blue-400 dark:from-sky-500 dark:to-blue-400 rounded-t-lg hover:from-sky-700 hover:to-blue-500 transition-all duration-300 cursor-default"
                        style={{ height: `${heightPct}%`, minHeight: stat.count > 0 ? "4px" : "0" }}
                        title={`${stat.date}: ${stat.count} visits`}
                      />
                    </div>
                    {/* Date label below bar */}
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 text-center w-full truncate leading-tight mt-1">
                      {stat.date}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          {/* Y-axis hint */}
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] text-gray-400 dark:text-slate-500">0</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              Max: {Math.max(...analytics.daily_stats.map((s) => s.count), 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Purposes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Visit Purposes
        </h2>
        <div className="space-y-3">
          {analytics.top_purposes.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold text-sm">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.purpose}
                </span>
              </div>
              <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                {item.count} visits
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

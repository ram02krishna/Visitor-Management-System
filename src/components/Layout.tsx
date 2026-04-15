"use client";

import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { LogOut, Menu, X } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { navLinks } from "../lib/navigation";
import { supabase } from "../lib/supabase";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const canApprove = user?.role === "admin" || user?.role === "guard" || user?.role === "host";

  useEffect(() => {
    if (!canApprove) return;

    const fetchPending = async () => {
      let pendingQuery = supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      
      let activeQuery = supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("status", "checked-in");

      if (user?.role === "host") {
        pendingQuery = pendingQuery.eq("host_id", user.id);
        activeQuery = activeQuery.eq("host_id", user.id);
      }

      await pendingQuery;
      await activeQuery;
    };

    fetchPending();

    const channel = supabase
      .channel("pending_visits_bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, fetchPending)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [canApprove, user?.id, user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const accessibleNavLinks = user ? navLinks.filter((link) => link.roles.includes(user.role)) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">

      {/* ── Mobile Topbar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex justify-between h-16 items-center px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg shadow-sm">
              <img src="/visitor-management.png" alt="Logo" className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
              VMS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button
              className="p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu Overlay ── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur-xl pt-16 overflow-y-auto animate-fadeIn">
          <div className="p-4 space-y-1">
            {user && (
              <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {getInitials(user.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                </div>
              </div>
            )}

            {accessibleNavLinks.map((link) => {
              const isDashboard = link.href === "/app/dashboard";
              const isDashboardChild = isDashboard && (location.pathname.startsWith("/app/visits") || location.pathname === "/app/users");
              const isActive = location.pathname === link.href || isDashboardChild;

              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-semibold"
                    : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium"
                    }`}
                >
                  <link.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {link.label}
                </Link>
              );
            })}

            <button
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3.5 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-72 fixed inset-y-0 left-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-r border-white/50 dark:border-slate-700/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] overflow-y-auto z-30 transition-colors duration-300">

        <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md group-hover:shadow-sky-500/30 transition-all duration-300">
              <img src="/visitor-management.png" alt="Logo" className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent group-hover:from-sky-500 group-hover:to-blue-500 transition-colors">
              IIIT Nagpur VMS
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <p className="px-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Menu
          </p>
          {accessibleNavLinks.map((link) => {
            const isDashboard = link.href === "/app/dashboard";
            const isDashboardChild = isDashboard && (location.pathname.startsWith("/app/visits") || location.pathname === "/app/users");
            const isActive = location.pathname === link.href || isDashboardChild;

            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                  ? "text-sky-700 dark:text-sky-300 font-semibold"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium"
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-100 to-blue-50 dark:from-sky-900/40 dark:to-blue-900/20 opacity-100 border border-sky-200/50 dark:border-sky-700/50 rounded-xl mix-blend-multiply dark:mix-blend-lighten" />
                )}

                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-500 dark:bg-sky-400 rounded-r-md" />
                )}

                <link.icon
                  className={`relative z-10 h-5 w-5 mr-3 transition-colors duration-200 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-slate-800 mt-auto shrink-0 bg-gray-50/50 dark:bg-slate-800/20">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Appearance</span>
            <ThemeSwitcher />
          </div>

          {user && (
            <div className="flex items-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm relative group overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0 relative z-10">
                {getInitials(user.name)}
              </div>
              <div className="ml-3 overflow-hidden text-left flex-1 relative z-10">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 capitalize truncate">{user.role}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors relative z-10 ml-1"
                title="Logout"
              >
                <LogOut className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen transition-all duration-300 relative">
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 pt-20 pb-8 lg:pt-8 lg:pb-6">
          <Outlet />
        </div>
      </main>

    </div>
  );
}

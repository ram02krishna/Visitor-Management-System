"use client";

import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { LogOut, X } from "lucide-react";
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
  const { user, logout, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canApprove = user?.role === "admin" || user?.role === "guard" || user?.role === "host";

  // Listen for profile changes (role updates)
  useEffect(() => {
    if (!user?.id) return;

    const profileChannel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "hosts",
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id, refreshProfile]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canApprove, user?.id, user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const accessibleNavLinks = user ? navLinks.filter((link) => link.roles.includes(user.role)) : [];

  // Bottom tab bar shows max 6 links (most important first)
  const bottomTabLinks = accessibleNavLinks.slice(0, 6);

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-gray-50 dark:bg-slate-950">

      {/* ══════════════════════════════════════════
          MOBILE TOP BAR  (< lg)
          ══════════════════════════════════════════ */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-nav"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex justify-between h-14 items-center px-4">
          {/* Brand */}
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md shadow-sky-500/20">
              <img src="/visitor-management.png" alt="Logo" className="h-5 w-5" />
            </div>
            <span className="font-black text-lg tracking-tighter bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
              VMS
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            {/* User avatar — tapping opens a slim dropdown */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-90 transition-transform"
            >
              {user ? getInitials(user.name) : "?"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE PROFILE SHEET  (slides down from top)
          Replaces the old full-screen overlay.
          Locks to its own scroll if content overflows.
          ══════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <>
          {/* Dim backdrop — tap outside to dismiss */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={menuRef}
            className="lg:hidden fixed top-14 right-3 z-50 w-72 glass-panel rounded-3xl shadow-2xl animate-springIn overflow-hidden"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          >
            {/* User row */}
            {user && (
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/20 shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 capitalize font-semibold tracking-wide">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-3 space-y-1 scroll-ios max-h-[60dvh]">
              {accessibleNavLinks.map((link) => {
                const isDashboard = link.href === "/app/dashboard";
                const isDashboardChild =
                  isDashboard && location.pathname.startsWith("/app/visits");
                const isActive = location.pathname === link.href || isDashboardChild;

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-black"
                        : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 font-semibold"
                    }`}
                  >
                    <link.icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{link.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 bg-sky-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-red-500 dark:text-red-400 font-black text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          DESKTOP SIDEBAR  (≥ lg)
          ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 glass-sidebar z-30 overflow-y-auto scroll-ios relative">
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/50 dark:border-slate-800 shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/30 transition-all duration-300">
              <img src="/visitor-management.png" alt="Logo" className="w-6 h-6" />
            </div>
            <span className="font-black text-[22px] tracking-tighter bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
              IIIT Nagpur VMS
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-3 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
            Navigation
          </p>
          {accessibleNavLinks.map((link) => {
            const isDashboard = link.href === "/app/dashboard";
            const isDashboardChild =
              isDashboard && location.pathname.startsWith("/app/visits");
            const isActive = location.pathname === link.href || isDashboardChild;

            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center px-3 py-2.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "text-sky-700 dark:text-sky-300 font-black"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/70 dark:hover:bg-slate-800/50 font-semibold"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-100/80 to-blue-50/80 dark:from-sky-900/40 dark:to-blue-900/20 border border-sky-200/60 dark:border-sky-700/40 rounded-2xl" />
                )}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-sky-400 to-blue-500 rounded-r-full shadow-sm shadow-sky-500/40" />
                )}

                <link.icon
                  className={`relative z-10 h-4.5 w-4.5 mr-3 transition-colors duration-200 ${
                    isActive ? "text-sky-600 dark:text-sky-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="relative z-10 text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + controls footer */}
        <div className="p-4 border-t border-white/50 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between px-1 mb-4">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Appearance
            </span>
            <ThemeSwitcher />
          </div>

          {user && (
            <div className="flex items-center p-3 rounded-2xl glass border border-white/60 dark:border-slate-700/40 relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="ml-3 overflow-hidden text-left flex-1">
                <p className="text-sm font-black text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400 capitalize font-semibold">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all ml-1"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT AREA
          scroll-ios: rubber-band lives here only
          ══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Scroll container — rubber-band only inside here */}
        <div className="flex-1 scroll-ios pt-14 pb-[72px] lg:pt-0 lg:pb-0">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 lg:py-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════
          IOS BOTTOM TAB BAR  (< lg only)
          Fixed at bottom, clears iPhone home bar
          ══════════════════════════════════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-[56px]">
          {bottomTabLinks.map((link) => {
            const isDashboard = link.href === "/app/dashboard";
            const isDashboardChild =
              isDashboard && location.pathname.startsWith("/app/visits");
            const isActive = location.pathname === link.href || isDashboardChild;

            return (
              <Link
                key={link.href}
                to={link.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90 relative"
              >
                {/* Active glow dot */}
                {isActive && (
                  <span className="absolute top-1.5 w-1 h-1 bg-sky-500 rounded-full animate-tabPop" />
                )}

                <div
                  className={`flex items-center justify-center w-10 h-6 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-sky-100 dark:bg-sky-900/40"
                      : ""
                  }`}
                >
                  <link.icon
                    className={`transition-all duration-200 ${
                      isActive
                        ? "w-5 h-5 text-sky-600 dark:text-sky-400"
                        : "w-[18px] h-[18px] text-gray-400 dark:text-slate-500"
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </div>

                <span
                  className={`text-[9px] font-black tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {link.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

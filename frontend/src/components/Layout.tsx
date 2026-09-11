import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { LogOut, X } from "lucide-react";

import { ThemeSwitcher } from "./ThemeSwitcher";
import { navLinks } from "../lib/navigation";
import { Logo } from "./Logo";
import { EmergencyBanner } from "./EmergencyBanner";

function getInitials(name: string) {
  const cleanName = name === "System Administrator" ? "Admin" : name;
  if (cleanName.length <= 2) return cleanName.toUpperCase();
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length === 1) return cleanName.substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Layout() {
  const { user, logout, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      refreshProfile();
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id, refreshProfile]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const accessibleNavLinks = user ? navLinks.filter((link) => link.roles.includes(user.role)) : [];

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-gray-50 dark:bg-slate-950">
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-nav"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex justify-between h-14 items-center px-4">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shadow-indigo-500/20 active:scale-90 transition-transform cursor-pointer"
            >
              {user ? getInitials(user.name) : "?"}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            ref={menuRef}
            className="lg:hidden fixed top-14 right-3 z-50 w-72 glass-panel rounded-2xl shadow-xl animate-springIn overflow-hidden"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          >
            {user && (
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-black text-sm shadow-xs shadow-indigo-500/20 shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                    {user.name === "System Administrator" ? "Admin" : user.name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400 capitalize font-semibold tracking-wide">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-3 space-y-1 scroll-ios max-h-[60dvh]">
              {accessibleNavLinks.map((link) => {
                const isDashboard = link.href === "/app/dashboard";
                const isDashboardChild = isDashboard && location.pathname.startsWith("/app/visits");
                const isActive = location.pathname === link.href || isDashboardChild;

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-black"
                        : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 font-semibold"
                    }`}
                  >
                    <link.icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-xs sm:text-sm">{link.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 bg-sky-500 rounded-full" />}
                  </Link>
                );
              })}
            </div>
            <div className="p-3 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 dark:text-red-400 font-black text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <aside className="hidden lg:flex flex-col w-64 glass-sidebar border-r border-gray-200/80 dark:border-slate-800 z-30 transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 group">
            <Logo size="md" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
            Navigation
          </p>

          {accessibleNavLinks.map((link) => {
            const isDashboard = link.href === "/app/dashboard";
            const isDashboardChild = isDashboard && location.pathname.startsWith("/app/visits");
            const isActive = location.pathname === link.href || isDashboardChild;

            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "text-sky-700 dark:text-sky-300 font-bold"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100/70 dark:hover:bg-slate-800/50 font-medium"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 rounded-xl" />
                )}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-sky-500 rounded-r-full shadow-xs shadow-sky-500/40" />
                )}

                <link.icon
                  className={`relative z-10 h-4.5 w-4.5 mr-3 transition-colors duration-200 ${
                    isActive
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="relative z-10 text-xs sm:text-sm">{link.label}</span>
                {isActive && (
                  <span className="ml-auto relative z-10 w-1.5 h-1.5 bg-sky-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Appearance
            </span>
            <ThemeSwitcher />
          </div>

          {user && (
            <div className="flex items-center p-2 rounded-xl bg-gray-50/80 dark:bg-slate-900/80 border border-gray-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0 ml-2.5">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {user.name === "System Administrator" ? "Admin" : user.name}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 capitalize font-medium">
                  {user.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ml-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <EmergencyBanner />
        <div className="flex-1 scroll-ios pt-14 pb-[72px] lg:pt-0 lg:pb-0">
          <div className="w-full px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
            <Outlet />
          </div>
        </div>
      </main>

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-gray-200/80 dark:border-slate-800/80 shadow-xl backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {accessibleNavLinks.slice(0, 4).map((link) => {
            const isDashboard = link.href === "/app/dashboard";
            const isDashboardChild = isDashboard && location.pathname.startsWith("/app/visits");
            const isActive = location.pathname === link.href || isDashboardChild;

            return (
              <Link
                key={link.href}
                to={link.href}
                className="flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-95 relative"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {isActive && (
                  <span className="absolute top-0.5 w-2 h-1 bg-sky-500 rounded-full shadow-xs" />
                )}

                <div
                  className={`flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 shadow-xs"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  <link.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <span
                  className={`text-[10px] font-bold tracking-tight truncate max-w-[68px] mt-0.5 ${
                    isActive ? "text-sky-600 dark:text-sky-400 font-black" : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {link.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-95 ${
              isMobileMenuOpen ? "text-sky-600 dark:text-sky-400 font-black" : "text-gray-400 dark:text-slate-500"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex items-center justify-center w-10 h-7 rounded-xl">
              <span className="text-lg leading-none font-bold">☰</span>
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

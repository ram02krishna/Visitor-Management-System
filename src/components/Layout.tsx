"use client";

import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { LogOut, Menu, Home, X } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { navLinks } from "../lib/navigation";

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const accessibleNavLinks = user ? navLinks.filter((link) => link.roles.includes(user.role)) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-800/50 border-b border-gray-200 dark:border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Home Link */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 mr-1 text-gray-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:scale-110 active:scale-95"
                aria-label="Go back"
                title="Go back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
              <Link
                to="/app/dashboard"
                className="flex items-center text-gray-700 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 group"
              >
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg shadow-md transition-all duration-300">
                  <Home
                    className="h-4 w-4 sm:h-5 sm:w-5 text-white"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </div>
                <span className="ml-2 sm:ml-3 font-bold text-base sm:text-lg">
                  <span className="hidden sm:inline">Visitor Management System</span>
                  <span className="sm:hidden">Visitor Management System</span>
                </span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-gray-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:scale-110 active:scale-95"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
              title="Toggle navigation menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              )}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-8">
              {accessibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800 group"
                >
                  <link.icon
                    className="h-5 w-5 mr-1 transition-transform duration-300"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User Info & Logout Button - Desktop */}
            {user && (
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                    {user.role}
                  </p>
                </div>
                <ThemeSwitcher />
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50 hover:scale-105 active:scale-95 group"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut
                    className="h-5 w-5 mr-1 transition-transform duration-300"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 animate-fadeIn border border-gray-200 dark:border-slate-700">
              {user && (
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                        {user.role}
                      </p>
                    </div>
                    <ThemeSwitcher />
                  </div>
                </div>
              )}

              {accessibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-900 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-300 mb-1"
                >
                  <link.icon className="h-5 w-5" strokeWidth={2} />
                  {link.label}
                </Link>
              ))}

              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full text-left px-3 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 mt-2"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" strokeWidth={2} />
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

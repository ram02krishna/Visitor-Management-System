"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/auth";
import log from "../lib/logger";
import { SEOMeta } from "./SEOMeta";

export function Login() {
  const navigate = useNavigate();
  const { login, signInWithGoogle, isAuthenticated } = useAuthStore();
  const isLoading = useAuthStore((state) => state.isLoading);
  const storeError = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const error = storeError || localError;

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    log.info("[Login] Form submitted with email:", email);
    setLocalError("");

    try {
      log.info("[Login] Calling login function...");
      await login(email, password);
      log.info("[Login] Login successful, navigating to dashboard");
      navigate("/app/dashboard");
    } catch (err) {
      log.error("[Login] Login failed:", err);
      setLocalError("Login failed. Please check your credentials and try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      log.error("[Login] Google Sign-In failed:", err);
      setLocalError("Google Sign-In failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      <SEOMeta title="Log In" />

      {/* ── Left Panel (Branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-sky-600 to-indigo-900 border-r border-sky-800">

        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')]"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full h-full text-white">
          <div className="glass-dark border border-white/10 rounded-3xl p-8 max-w-lg shadow-2xl animate-slideInLeft">
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-white/20">
              <Shield className="w-10 h-10 text-sky-300" strokeWidth={1.5} />
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-6">
              Secure.<br />Seamless.<br />Smart.
            </h1>

            <p className="text-lg text-sky-100/80 mb-10 leading-relaxed font-light">
              Welcome to the Indian Institute Of Information Technology Nagpur Visitor Management System. Designed for uncompromising security and ease of use.
            </p>

            <div className="space-y-4">
              {[
                "Campus-wide security",
                "Real-time visitor tracking",
                "Instant host notifications"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sky-50">
                  <CheckCircle2 strokeWidth={2} className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm xl:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-8 lg:px-12 xl:px-24">
        <div className="w-full max-w-md mx-auto relative z-10">

          <div className="mb-6 animate-fadeInUp">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          <div className="text-center lg:text-left mb-10 animate-fadeInUp">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-sky-100 dark:bg-sky-900/40 rounded-2xl shadow-sm border border-sky-200 dark:border-sky-800/50">
                <Shield className="h-10 w-10 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-base text-gray-600 dark:text-slate-400">
              Please enter your details to sign in
            </p>
          </div>

          <div className="glass p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/50 dark:border-slate-800 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 dark:hover:border-slate-600"
                  placeholder="name@campus.edu"
                />
              </div>

              <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 dark:hover:border-slate-600 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="animate-fadeIn p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0"><Shield className="w-4 h-4" /></div>
                  <p>{error}</p>
                </div>
              )}

              <div className="pt-2 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-white dark:focus:ring-offset-slate-950 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-95 group"
                >
                  {isLoading ? (
                    <span className="loading-spinner w-5 h-5 mr-2"></span>
                  ) : (
                    "Sign in"
                  )}
                  {!isLoading && <ArrowRight className="ml-2 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />}
                </button>
              </div>
            </form>

            <div className="mt-8 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white/80 dark:bg-slate-900/80 text-gray-500 dark:text-slate-400 font-medium">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-gray-200 dark:border-slate-700 rounded-xl text-base font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 dark:focus:ring-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-95"
                >
                  <img
                    className="w-5 h-5 mr-3"
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google logo"
                  />
                  Google
                </button>
              </div>
            </div>

            <div className="mt-8 text-center animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors duration-300 underline underline-offset-4 decoration-sky-600/30 hover:decoration-sky-600"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

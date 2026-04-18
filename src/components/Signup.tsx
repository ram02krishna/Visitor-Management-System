"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Eye, EyeOff, ArrowRight, ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { supabase } from "../lib/supabase";
import log from "../lib/logger";

type Department = {
  id: string;
  name: string;
};

export function Signup() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4); // Max 4 points for the bar
  };

  const strength = calculatePasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }

    try {
      await signup(email, password, name, departmentId);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "Failed to create account";
      setError(errorMsg);

      // If the error is about user already being registered, highlight the login link
      if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
        log.warn("[Signup] User already exists, directing to login");
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* ── Left Panel (Branding) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-800 to-sky-900 border-r border-indigo-900">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')]"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow"></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full h-full text-white">
          <div className="glass-dark border border-white/10 rounded-[2rem] p-8 max-w-lg shadow-2xl animate-slideInLeft">
            <div className="inline-flex gap-2 items-center mb-8 px-4 py-2 rounded-full border border-sky-400/30 bg-sky-900/40 text-sky-200 text-sm font-medium">
              <Shield size={16} /> Indian Institute Of Information Technology Nagpur
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-6">
              Start managing
              <br />
              visitors better, today.
            </h1>

            <p className="text-lg text-indigo-100/80 mb-10 leading-relaxed font-light">
              Create an account to gain instant access to seamless visitor registration, powerful
              analytics, and bulletproof security.
            </p>

            <div className="space-y-5">
              {[
                {
                  title: "Quick Setup",
                  desc: "Get started in minutes with intuitive configuration.",
                },
                {
                  title: "Campus Collaboration",
                  desc: "Easily invite guards, admins, and faculty/staff.",
                },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="p-2.5 rounded-[1.25rem] bg-white/10 mt-1">
                    <CheckCircle2 strokeWidth={2} className="text-sky-300 w-5 h-5 flex-shrink-0" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{feature.title}</h4>
                    <p className="text-sm text-indigo-200/80 mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col justify-center py-8 sm:py-10 px-0 sm:px-8 lg:px-12 xl:px-24 min-h-[100dvh] lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-md sm:max-w-lg mx-auto relative z-10 sm:py-8">
          <div className="mb-6 px-5 sm:px-0 animate-fadeInUp">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white sm:bg-transparent dark:bg-slate-900 sm:dark:bg-transparent border border-gray-200 dark:border-slate-800 sm:border-transparent rounded-2xl shadow-sm sm:shadow-none hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          <div className="text-center lg:text-left mb-6 sm:mb-8 px-5 sm:px-0 animate-fadeInUp">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl shadow-sm border border-indigo-200 dark:border-indigo-800/50">
                <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Create account
            </h2>
            <p className="mt-2 text-base text-gray-600 dark:text-slate-400">
              Sign up to access the IIIT Nagpur VMS
            </p>
          </div>

          <div
            className="sm:glass px-5 sm:px-8 py-2 sm:py-8 sm:rounded-[2rem] sm:shadow-xl sm:border border-gray-100/50 dark:border-slate-800 animate-fadeInUp"
            style={{ animationDelay: "0.1s" }}
          >
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-medium">Account created successfully! Redirecting...</span>
              </div>
            )}

            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300"
                  placeholder="John Doe"
                />
              </div>

              <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1"
                >
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
                  className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300"
                  placeholder="name@campus.edu"
                />
              </div>

              <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1"
                >
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    id="department"
                    name="department"
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 appearance-none"
                  >
                    <option value="" disabled className="text-gray-400">
                      Select a department
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="animate-fadeInUp grid gap-5 grid-cols-1 sm:grid-cols-2"
                style={{ animationDelay: "0.4s" }}
              >
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2.5 px-1 animate-fadeIn">
                      <div className="flex gap-1 h-1 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-slate-800">
                        {[1, 2, 3, 4].map((point) => (
                          <div
                            key={point}
                            className={`h-full w-1/4 transition-colors duration-300 ${
                              strength >= point ? strengthColors[strength - 1] : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`text-xs mt-1.5 font-medium ${strength >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-slate-400"}`}
                      >
                        {strengthLabels[strength > 0 ? strength - 1 : 0]} password
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 ml-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="animate-fadeIn p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <p>{error}</p>
                </div>
              )}

              <div className="pt-4 animate-fadeInUp" style={{ animationDelay: "0.5s" }}>
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-95 group"
                >
                  {isLoading ? (
                    <span className="loading-spinner w-5 h-5 mr-2"></span>
                  ) : (
                    "Create Account"
                  )}
                  {!isLoading && (
                    <ArrowRight className="ml-2 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center animate-fadeInUp" style={{ animationDelay: "0.6s" }}>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors duration-300 underline underline-offset-4 decoration-sky-600/30 hover:decoration-sky-600"
                >
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

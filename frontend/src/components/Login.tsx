import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";

import { useAuthStore } from "../store/auth";
import log from "../lib/logger";
import { SEOMeta } from "./SEOMeta";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { GoogleLogin } from "@react-oauth/google";
import { API_BASE } from "../lib/api";
import { toast } from "react-hot-toast";
import { Logo } from "./Logo";
import { BackButton } from "./BackButton";

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const isLoading = useAuthStore((state) => state.isLoading);
  const storeError = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const [view, setView] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

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

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");

      localStorage.setItem("vms_token", data.token);
      localStorage.setItem("vms_user_profile", JSON.stringify(data.user));
      useAuthStore.setState({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
      navigate("/app/dashboard");
    } catch (err: unknown) {
      setLocalError((err as Error).message);
    }
  };

  const handleGoogleError = () => {
    setLocalError("Google Sign-In failed.");
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    setLocalError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      toast.success("If the email is registered, an OTP has been sent.");
      navigate(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
    } catch (err: unknown) {
      setLocalError((err as Error).message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950 relative">
      <div className="fixed top-6 right-6 z-50">
        <ThemeSwitcher />
      </div>
      <SEOMeta title="Log In" />
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-sky-600 to-indigo-900 border-r border-sky-800">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')]"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow"></div>
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full h-full text-white">
          <div className="glass-dark border border-white/10 rounded-2xl p-8 max-w-lg shadow-2xl animate-slideInLeft">
            <div className="inline-flex gap-2 items-center mb-8 px-4 py-2 rounded-full border border-sky-400/30 bg-sky-900/40 text-sky-200 text-sm font-medium">
              <ShieldCheck size={16} /> Indian Institute Of Information Technology Nagpur
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tighter mb-6">
              Secure.
              <br />
              Seamless.
              <br />
              Smart.
            </h1>

            <p className="text-lg text-sky-100/80 mb-10 leading-relaxed font-light">
              Welcome to the IIIT Nagpur VMS
              System. Designed for uncompromising security and ease of use.
            </p>

            <div className="space-y-4">
              {[
                "Campus-wide security",
                "Real-time visitor tracking",
                "Instant host notifications",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sky-50">
                  <CheckCircle2
                    strokeWidth={2}
                    className="text-emerald-400 w-5 h-5 flex-shrink-0"
                  />
                  <span className="font-medium text-sm xl:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-8 lg:px-12 xl:px-24">
        <div className="w-full max-w-md mx-auto relative z-10">
          <BackButton to="/" />

          <div className="text-center lg:text-left mb-10">

            <div className="lg:hidden flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {view === "login" ? "Welcome back" : "Forgot Password"}
            </h2>
            <p className="mt-2 text-base text-gray-600 dark:text-slate-400">
              {view === "login"
                ? "Please enter your details to sign in"
                : "Enter your email to receive a password reset code"}
            </p>
          </div>

          <div className="card">
            {view === "login" ? (
              <>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
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
                      className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 dark:hover:border-slate-600"
                      placeholder="name@campus.edu"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <label
                        htmlFor="password"
                        className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setView("forgot"); setLocalError(""); }}
                        className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 hover:border-gray-300 dark:hover:border-slate-600 pr-12"
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
                    <div className="animate-fadeIn p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full flex justify-center items-center py-3"
                    >
                      {isLoading ? <span className="loading-spinner w-5 h-5 mr-2"></span> : "Sign in"}
                      {!isLoading && (
                        <ArrowRight className="ml-2 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8">
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

                  <div className="mt-6 flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      text="continue_with"
                      width="100%"
                    />
                  </div>
                </div>

                <div className="mt-8 text-center animate-fadeInUp" style={{ animationDelay: "0.6s" }}>
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
              </>
            ) : (
              <form className="space-y-5" onSubmit={handleForgotSubmit}>
                <div>
                  <label htmlFor="forgot-email" className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
                    placeholder="name@campus.edu"
                  />
                </div>
                {error && (
                  <div className="animate-fadeIn p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={isForgotLoading} className="btn-primary w-full flex justify-center items-center py-3">
                    {isForgotLoading ? <span className="loading-spinner w-5 h-5 mr-2"></span> : "Send Reset Code"}
                  </button>
                </div>
                <div className="mt-6 flex justify-center">
                  <BackButton onClick={() => { setView("login"); setLocalError(""); }} label="Back to Login" className="mb-0" />
                </div>
              </form>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}

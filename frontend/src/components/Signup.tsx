import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, ArrowRight, Building2, CheckCircle2, AlertCircle, GraduationCap, UserCheck } from "lucide-react";

import { useAuthStore } from "../store/auth";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { api, API_BASE } from "../lib/api";
import { validatePasswordStrength } from "../lib/sanitize";
import log from "../lib/logger";
import { GoogleLogin } from "@react-oauth/google";
import { CustomSelect } from "./ui/CustomSelect";
import { Logo } from "./Logo";
import { BackButton } from "./BackButton";

type Department = {
  id: string;
  name: string;
};

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "dept_cse", name: "Computer Science & Engineering (CSE)" },
  { id: "dept_ece", name: "Electronics & Communication Engineering (ECE)" },
  { id: "dept_csa", name: "AI & Machine Learning (CSA)" },
  { id: "dept_bs", name: "Basic Sciences & Humanities" },
  { id: "dept_tnp", name: "Training & Placement Cell (T&P)" },
  { id: "dept_hostel", name: "Hostel & Estate Administration" },
  { id: "dept_sec", name: "Campus Security & Safety" },
  { id: "dept_admin", name: "General Administration & Dean Office" },
];

export function Signup() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [accountType, setAccountType] = useState<"student" | "visitor" | "host">("student");
  const [rollNumber, setRollNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [view, setView] = useState<"signup" | "verify">("signup");
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const loadDepartments = async () => {
    try {
      const data = await api.departments.list();
      if (data && data.length > 0) {
        setDepartments(data);
      }
    } catch (err) {
      console.error("Error loading departments, using defaults:", err);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4); // Max 4 points for the bar
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
      setError((err as Error).message);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-Up failed.");
  };

  const strength = calculatePasswordStrength(password);
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (view === "verify") return;

    if (accountType === "student" && !rollNumber.trim()) {
      setError("Please enter your College Roll Number (e.g. BT23CSE026).");
      return;
    }

    if (accountType === "host" && !departmentId) {
      setError("Please select your department.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    try {
      const result = await signup(
        email,
        password,
        name,
        departmentId || undefined,
        accountType,
        accountType === "student" ? rollNumber.trim().toUpperCase() : undefined
      );
      setSuccess(true);
      if (result?.requiresVerification) {
        setTimeout(() => {
          setSuccess(false);
          setView("verify");
        }, 2000);
      } else {
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "Failed to create account";
      setError(errorMsg);
      if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
        log.warn("[Signup] User already exists, directing to login");
      }
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify OTP");
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950 relative">
      <div className="fixed top-6 right-6 z-50">
        <ThemeSwitcher />
      </div>
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-800 to-sky-900 border-r border-indigo-900">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')]"></div>
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full h-full text-white">
          <div className="glass-dark border border-white/10 rounded-2xl p-8 max-w-lg shadow-2xl animate-slideInLeft">
            <div className="inline-flex gap-2 items-center mb-8 px-4 py-2 rounded-full border border-sky-400/30 bg-sky-900/40 text-sky-200 text-sm font-medium">
              <ShieldCheck size={16} /> Indian Institute Of Information Technology Nagpur
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
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col pt-12 pb-8 sm:pt-16 sm:pb-10 px-4 sm:px-8 lg:px-12 xl:px-24 min-h-[100dvh] lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-md sm:max-w-lg mx-auto relative z-10 sm:py-8 my-auto">
          <BackButton to="/" />

          <div className="text-center lg:text-left mb-10">

            <div className="lg:hidden flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {view === "signup" ? "Create account" : "Verify Your Email"}
            </h2>
            <p className="mt-2 text-base text-gray-600 dark:text-slate-400">
              {view === "signup" ? "Sign up to access the IIIT Nagpur VMS" : "Enter the 6-digit code sent to your email"}
            </p>
          </div>

          <div className="card">
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-medium">
                  {view === "signup" ? "Account created successfully! Redirecting..." : "Email verified successfully! Redirecting..."}
                </span>
              </div>
            )}

            {view === "signup" ? (
              <>
                <form className="space-y-5" onSubmit={handleSubmit}>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Account Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType("student")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${accountType === "student"
                            ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm"
                            : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                          }`}
                      >
                        <GraduationCap className="w-5 h-5 mb-1 text-sky-500" />
                        <span>Resident Student</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType("visitor")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${accountType === "visitor"
                            ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm"
                            : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                          }`}
                      >
                        <UserCheck className="w-5 h-5 mb-1 text-emerald-500" />
                        <span>Visitor / Guest</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType("host")}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${accountType === "host"
                            ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm"
                            : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300"
                          }`}
                      >
                        <Building2 className="w-5 h-5 mb-1 text-indigo-500" />
                        <span>Campus Staff</span>
                      </button>
                    </div>
                  </div>

                  {accountType === "student" && (
                    <div>
                      <label
                        htmlFor="rollNumber"
                        className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
                      >
                        College Roll Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="rollNumber"
                        name="rollNumber"
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                        className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 font-mono font-bold text-sm tracking-wider uppercase"
                        placeholder="e.g. BT23CSE026"
                      />
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1.5 ml-1 flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Verified against official College Student Directory
                      </p>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="name"
                      className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
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
                      className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-600 text-sm font-medium"
                      placeholder="John Doe"
                    />
                  </div>

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
                      className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-600 text-sm font-medium"
                      placeholder={accountType === "student" ? "bt23cse026@iiitn.ac.in" : "name@example.com"}
                    />
                  </div>

                  {accountType === "host" && (
                    <div>
                      <label
                        htmlFor="department"
                        className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
                      >
                        Department <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <CustomSelect
                          id="department"
                          name="department"
                          required
                          value={departmentId}
                          onChange={setDepartmentId}
                          options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                          placeholder="Select a department"
                          icon={<Building2 className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
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
                          className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-600 pr-10 text-sm font-medium"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {password.length > 0 && (
                        <div className="mt-2.5 px-1">
                          <div className="flex gap-1 h-1 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-slate-800">
                            {[1, 2, 3, 4].map((point) => (
                              <div
                                key={point}
                                className={`h-full w-1/4 transition-colors duration-300 ${strength >= point ? strengthColors[strength - 1] : "bg-transparent"
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
                        className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1"
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
                          className="block w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-slate-600 pr-10 text-sm font-medium"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
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
                    <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className="btn-primary w-full flex justify-center items-center py-3"
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

                <div className="mt-8 text-center">
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
              </>
            ) : (
              <form className="space-y-5" onSubmit={handleVerifySubmit}>
                <div>
                  <label htmlFor="verify-email" className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    Email address
                  </label>
                  <input
                    id="verify-email"
                    type="email"
                    disabled
                    value={email}
                    className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-500 dark:text-slate-400 focus:outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="otp" className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    6-Digit Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    placeholder="------"
                    className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 text-center tracking-widest font-mono text-lg"
                  />
                </div>
                {error && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={verifyLoading || success} className="btn-primary w-full flex justify-center items-center py-3">
                    {verifyLoading ? <span className="loading-spinner w-5 h-5 mr-2"></span> : "Verify"}
                  </button>
                </div>
                <div className="mt-6 flex justify-center">
                  <BackButton onClick={() => { setView("signup"); setError(""); }} label="Back to Signup" className="mb-0" />
                </div>
              </form>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}

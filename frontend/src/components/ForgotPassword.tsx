import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { toast } from "react-hot-toast";
import { API_BASE } from "../lib/api";
import { Logo } from "./Logo";
import { BackButton } from "./BackButton";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      toast.success("If the email is registered, an OTP has been sent.");
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-slate-800">
        <BackButton to="/login" />

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" badgeOnly />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Forgot Password</h2>
          <p className="text-sm text-gray-500 mt-2">Enter your email to receive a password reset code.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-gray-900 dark:text-white text-sm" placeholder="name@campus.edu" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? "Sending..." : "Send Reset Code"} {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

    </div>
  );
}

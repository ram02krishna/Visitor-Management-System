"use client";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, ClipboardList, BarChart2, Menu, X, ArrowRight } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useAuthStore } from "../store/auth";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure Check-ins",
    description: "Ensure only authorized visitors access the campus with QR-code verification, roll-based approvals, and real-time gate alerts.",
    gradient: "from-emerald-500 to-green-600",
    shadow: "shadow-emerald-500/20",
  },
  {
    icon: ClipboardList,
    title: "Easy Registration",
    description: "Quick and intuitive visitor registration for everyone — walk-ins at the main gate, self-service kiosks, or pre-registered campus events.",
    gradient: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/20",
  },
  {
    icon: BarChart2,
    title: "Real-Time Monitoring",
    description: "Track visitor activity across campus with live dashboards, automated logs, and instant status updates for every entry and exit.",
    gradient: "from-purple-500 to-indigo-600",
    shadow: "shadow-purple-500/20",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col scroll-smooth bg-gray-50 dark:bg-slate-950">

      {/* ── Navbar ── */}
      <nav
        className={`w-full flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 fixed top-0 z-50 transition-all duration-500 ${scrolled
          ? "bg-white/95 dark:bg-slate-950/95 shadow-lg dark:shadow-slate-800/50 backdrop-blur-md border-b border-gray-200/60 dark:border-slate-800/60"
          : "bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg"
          }`}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <div className="p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg shadow-md shadow-sky-500/30 group-hover:shadow-sky-500/50 transition-all duration-300">
            <img src="/visitor-management.png" alt="Logo" className="h-6 w-6" />
          </div>
          <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
            Visitor Management System
          </span>
          <span className="sm:hidden text-base font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            VMS
          </span>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-2.5 items-center">
          <ThemeSwitcher />
          <button
            onClick={() => navigate("/request-visit")}
            className="border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
          >
            Request Visit
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="border border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-105 active:scale-95"
          >
            Sign Up
          </button>
          <button
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold py-2 px-5 rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/30 hover:scale-105 active:scale-95"
          >
            Log In
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden fixed top-[68px] left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-xl transition-all duration-300 ${mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
          }`}
      >
        <div className="px-4 py-3 space-y-1.5">
          {[
            { label: "Request Visit", path: "/request-visit", color: "emerald" },
            { label: "Sign Up", path: "/signup", color: "sky" },
            { label: "Log In", path: "/login", color: "blue" },
          ].map(({ label, path }) => (
            <button
              key={label}
              onClick={() => { navigate(path); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-all duration-200 font-medium text-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero Section (background image preserved) ── */}
      <div
        className="min-h-[88vh] flex items-center justify-center bg-cover bg-center px-4 sm:px-6 pt-24 pb-14 relative"
        style={{ backgroundImage: "url('/c8331ead-7366-4dc7-88a9-36ade9571557.jpg')" }}
      >
        {/* subtle dark overlay for better contrast only */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

        <div className="relative z-10 flex flex-col items-center gap-8 animate-scaleIn">
          {/* Card */}
          <div className="bg-transparent p-5 sm:p-8 max-w-2xl w-full text-center transition-all duration-500">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white drop-shadow-md mb-5 animate-fadeInUp leading-tight">
              Welcome to Indian Institute Of Information Technology Nagpur
            </h1>
            <p
              className="text-white/90 font-medium text-base sm:text-lg mb-8 animate-fadeInUp leading-relaxed drop-shadow-sm max-w-xl mx-auto"
              style={{ animationDelay: "0.15s" }}
            >
              The official visitor management system for Indian Institute Of Information Technology Nagpur. Enhance campus security and visitor efficiency seamlessly.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-3 justify-center animate-fadeInUp"
              style={{ animationDelay: "0.3s" }}
            >
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-2xl text-base transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-105 active:scale-95 shadow-lg"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate("/request-visit")}
                className="inline-flex items-center justify-center gap-2 border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-sky-700 font-semibold py-3 px-7 rounded-2xl text-base transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
              >
                Request a Visit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features Section ── */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section header */}
          <div className="text-center mb-12 animate-fadeInUp">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-sky-600 dark:text-sky-400 mb-3 bg-sky-50 dark:bg-sky-900/20 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-800/50">
              Why Choose Us
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-slate-100 mt-3">
              Everything you need to secure IIIT Nagpur
            </h2>
            <p className="mt-4 text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
              Our system is designed to keep the campus secure, your faculty and staff informed, and your visitors happy.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid gap-7 grid-cols-1 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description, gradient, shadow }, i) => (
              <div
                key={title}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-7 border border-gray-200 dark:border-slate-800 hover:border-transparent shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fadeInUp overflow-hidden"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {/* hover glow bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />

                <div className="relative">
                  <div className={`inline-flex p-4 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg ${shadow} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={36} className="text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{description}</p>
                </div>

                {/* bottom accent bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-3xl`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Extra CTA strip ── */}
      <section className="bg-gradient-to-r from-sky-600 to-blue-700 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Welcome to Indian Institute Of Information Technology Nagpur</h3>
          <p className="text-sky-100 mb-7 text-base">Experience a seamless and secure visitor management process.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="inline-flex items-center justify-center gap-2 bg-white text-sky-700 font-bold py-3 px-8 rounded-2xl hover:bg-sky-50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              Create Free Account <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate("/request-visit")}
              className="inline-flex items-center justify-center border-2 border-white/60 text-white font-semibold py-3 px-7 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Request a Visit
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-10 border-t border-gray-800 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg">
                <img src="/visitor-management.png" alt="Logo" className="h-5 w-5" />
              </div>
              <span className="font-bold text-white/90 text-sm">Visitor Management System</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm">
              {[
                { label: "Request Visit", path: "/request-visit" },
                { label: "Sign Up", path: "/signup" },
                { label: "Log In", path: "/login" },
              ].map(({ label, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} VMS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
export { Home };

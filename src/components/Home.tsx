"use client"

import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { ShieldCheck, ClipboardList, BarChart2, Menu, X } from "lucide-react"
import { ThemeSwitcher } from "./ThemeSwitcher"

import { useAuthStore } from "../store/auth"

const Home = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard")
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen flex flex-col scroll-smooth bg-gray-50 dark:bg-slate-950">
      {/* Navbar */}
      <nav
        className={`w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 fixed top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white dark:bg-slate-950 shadow-lg dark:shadow-slate-800/50"
            : "bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => navigate("/")}>
          <img src="/visitor-management.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8" />
          <div className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent animate-fadeIn">
            <span className="hidden sm:inline">Visitor Management System</span>
            <span className="sm:hidden">VMS</span>
          </div>
        </div>

        <div className="hidden md:flex gap-3 items-center">
          <ThemeSwitcher />
          <button
            onClick={() => navigate("/request-visit")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 lg:px-5 rounded-lg text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Request Visit
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 lg:px-5 rounded-lg text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Sign Up
          </button>
          <button
            onClick={() => navigate("/login")}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 lg:px-5 rounded-lg text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Log In
          </button>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[72px] left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-lg animate-fadeIn">
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={() => {
                navigate("/request-visit")
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300 font-medium"
            >
              Request Visit
            </button>
            <button
              onClick={() => {
                navigate("/signup")
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300 font-medium"
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                navigate("/login")
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-4 py-3 text-gray-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all duration-300 font-medium"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div
        className="min-h-[80vh] flex items-center justify-center bg-cover bg-center px-4 sm:px-6 pt-24 pb-10"
        style={{
          backgroundImage: "url('/c8331ead-7366-4dc7-88a9-36ade9571557.jpg')",
        }}
      >
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-2xl max-w-2xl text-center animate-scaleIn hover:shadow-3xl transition-all duration-500 border border-gray-200 dark:border-slate-800">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent mb-4 sm:mb-6 animate-fadeInUp text-balance">
            Streamline Your Visitor Experience
          </h1>
          <p
            className="text-gray-700 dark:text-slate-300 text-base sm:text-lg mb-6 sm:mb-8 animate-fadeInUp text-pretty"
            style={{ animationDelay: "0.2s" }}
          >
            Modernize your front desk with our easy-to-use visitor management system. Enhance security and efficiency
            seamlessly.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg text-base sm:text-lg transition-all duration-300 hover:shadow-xl hover:scale-110 active:scale-95 animate-fadeInUp"
            style={{ animationDelay: "0.4s" }}
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-gray-100 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-center">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group animate-fadeInUp border border-gray-200 dark:border-slate-700">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg transition-all duration-300">
                <ShieldCheck size={40} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">Secure Check-ins</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
              Ensure only authorized visitors gain access.
            </p>
          </div>

          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group animate-fadeInUp border border-gray-200 dark:border-slate-700"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl shadow-lg transition-all duration-300">
                <ClipboardList size={40} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">Easy Registration</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
              Quick and intuitive visitor registration process.
            </p>
          </div>

          <div
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group animate-fadeInUp border border-gray-200 dark:border-slate-700 sm:col-span-2 lg:col-span-1"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg transition-all duration-300">
                <BarChart2 size={40} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">
              Real-Time Monitoring
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300">
              Track visitor activity with live updates.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-6 text-center transition-all duration-300 border-t border-gray-200 dark:border-slate-900">
        <p className="text-sm md:text-base px-4">
          &copy; {new Date().getFullYear()} Visitor Management System. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default Home
export { Home }

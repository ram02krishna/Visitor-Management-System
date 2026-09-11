import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Menu,
  X,
  ArrowRight,
  GraduationCap,
  Building2,
  Radio,
  PackageSearch,
  Car,
  ScanLine,
  ChevronDown,
  Laptop,
  UserPlus,
  CalendarPlus,
  LogIn
} from "lucide-react";

import { ThemeSwitcher } from "./ThemeSwitcher";
import { useAuthStore } from "../store/auth";
import { SEOMeta } from "./SEOMeta";
import { Logo } from "./Logo";

const MODULE_FEATURES = [
  {
    icon: ScanLine,
    badge: "Gate Optical Scanner",
    title: "High-Speed QR Checkpoints",
    description: "Sub-50ms optical camera verification for students and visitors with automated curfew alerts and overstay radar.",
    gradient: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/20",
    path: "/login"
  },
  {
    icon: Building2,
    badge: "Hostel Hub",
    title: "Hostel Block A 10-Floor Census",
    description: "Real-time occupancy tracking for 400+ residents across 10 floors, automated 09:30 PM curfew audits, and disciplinary dossiers.",
    gradient: "from-indigo-500 to-purple-600",
    shadow: "shadow-indigo-500/20",
    path: "/login"
  },
  {
    icon: Laptop,
    badge: "Touch Reception",
    title: "Instant Self-Service Kiosk",
    description: "4 dedicated entry pathways (Walk-In, Courier Drop-Off, Interview Candidate, and VIP Dignitary) with instant badge tokens.",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/20",
    path: "/kiosk"
  },
  {
    icon: Radio,
    badge: "Campus Safety",
    title: "Broadcast SOS & Evacuation",
    description: "Instant emergency beacon broadcast with geolocation tagging, evacuation protocol push, and live safety headcount.",
    gradient: "from-rose-500 to-red-600",
    shadow: "shadow-rose-500/20",
    path: "/login"
  },
  {
    icon: GraduationCap,
    badge: "Student Portal",
    title: "Digital Pass & Outings",
    description: "Digital Gatepass ID with dynamic QR code, curfew extension requests, and verified parent consent workflows.",
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/20",
    path: "/student-pass"
  },
  {
    icon: PackageSearch,
    badge: "Campus Registry",
    title: "Lost & Found Custody Tracker",
    description: "Digital registry for misplaced campus valuables with verified handover PINs and officer custody audit trails.",
    gradient: "from-cyan-500 to-blue-600",
    shadow: "shadow-cyan-500/20",
    path: "/login"
  },
  {
    icon: BarChart3,
    badge: "Gate Telemetry",
    title: "24-Hour Checkpoint Inflow",
    description: "Real-time gate telemetry with night curfew analytics, live campus capacity gauge, and predictive peak-hour radar.",
    gradient: "from-violet-500 to-indigo-600",
    shadow: "shadow-violet-500/20",
    path: "/login"
  },
  {
    icon: Car,
    badge: "Smart Logistics",
    title: "Vehicle Parking Pass System",
    description: "Automated license plate registry for 2-wheelers and 4-wheelers with designated parking bay validation.",
    gradient: "from-teal-500 to-emerald-600",
    shadow: "shadow-teal-500/20",
    path: "/login"
  },
];

const FAQS = [
  {
    q: "What are the standard Day Outing curfew timings for hostel residents?",
    a: "Standard Day Outing curfew is strictly 09:30 PM (21:30 IST). Any student check-in between 09:30 PM and 06:00 AM without an approved Curfew Extension is recorded as a Late Return and increments the student's 3-strike disciplinary record."
  },
  {
    q: "How does the Self-Service Reception Kiosk work for visitors?",
    a: "Visitors can simply tap the kiosk at the reception desk, select their visit category (General, Delivery, Interview, or VIP), input their mobile number and take a quick photo badge. An instant pass token is generated in seconds."
  },
  {
    q: "How can students apply for multi-day leaves or curfew extensions?",
    a: "Students can log in to the Student Pass Portal to submit a Leave Application (Vacation, Medical, Academic) or request a 30–60 minute Curfew Extension directly to the Warden Office."
  },
  {
    q: "How does the Broadcast SOS feature alert campus security?",
    a: "When triggered by any authenticated user or security officer, a campus-wide alert with high-priority audio chime displays real-time instructions, emergency contacts, and a live safety check-in status across all screens."
  }
];

const Home = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeRoleTab, setActiveRoleTab] = useState<"students" | "guards" | "wardens" | "visitors">("students");
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
    <div className="min-h-screen flex flex-col scroll-smooth bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white selection:bg-sky-500 selection:text-white">
      <SEOMeta title="IIIT Nagpur VMS — Smart Visitor & Campus Security System" />

      <nav
        className={`w-full flex items-center justify-between px-4 sm:px-6 lg:px-12 py-3.5 fixed top-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-white/90 dark:bg-slate-950/90 shadow-md dark:shadow-slate-900/50 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80"
            : "bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg border-b border-transparent"
          }`}
      >
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <Logo size="md" />
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Main Gate & Hostel Block A Online</span>
        </div>

        <div className="hidden md:flex gap-2 items-center">
          <ThemeSwitcher />
          <button
            onClick={() => navigate("/kiosk")}
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100/80 hover:bg-sky-50 text-gray-700 hover:text-sky-600 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-sky-400 border border-gray-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Laptop className="w-3.5 h-3.5 text-sky-500" />
            <span>Reception Kiosk</span>
          </button>
          <button
            onClick={() => navigate("/app/student-pass")}
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100/80 hover:bg-purple-50 text-gray-700 hover:text-purple-600 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-purple-400 border border-gray-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
            <span>Student Pass</span>
          </button>
          <button
            onClick={() => navigate("/request-visit")}
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100/80 hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-emerald-400 border border-gray-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Request Visit</span>
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100/80 hover:bg-sky-50 text-gray-700 hover:text-sky-600 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-sky-400 border border-gray-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-sky-500" />
            <span>Sign Up</span>
          </button>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary !py-1.5 !px-4 !text-xs sm:!text-sm !rounded-xl !shadow-md flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <div
        className={`md:hidden fixed top-[64px] left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-2xl transition-all duration-300 ${mobileMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-3 pointer-events-none"
          }`}
      >
        <div className="px-4 py-4 space-y-2">
          {[
            { label: "Reception Kiosk", path: "/kiosk", icon: Laptop, color: "text-sky-500" },
            { label: "Student Pass", path: "/app/student-pass", icon: GraduationCap, color: "text-purple-500" },
            { label: "Request Visit", path: "/request-visit", icon: CalendarPlus, color: "text-emerald-500" },
            { label: "Sign Up", path: "/signup", icon: UserPlus, color: "text-sky-500" },
            { label: "Log In", path: "/login", icon: LogIn, color: "text-blue-600" },
          ].map(({ label, path, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => {
                navigate(path);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 text-gray-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800/80 rounded-xl transition-all font-semibold text-sm flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span>{label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative pt-36 sm:pt-44 pb-28 sm:pb-36 overflow-hidden bg-cover bg-center bg-no-repeat min-h-[82vh] flex flex-col justify-center items-center"
        style={{ backgroundImage: "url('/c8331ead-7366-4dc7-88a9-36ade9571557.jpg')" }}
      >

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/55" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5 my-auto">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
            IIIT Nagpur Security Ecosystem
          </h1>

          <p className="text-sm sm:text-base text-white/90 font-medium max-w-xl mx-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            Digital gatepass, Hostel Block A census, reception kiosks, and 24-hour campus security.
          </p>
        </div>
      </div>

      <section className="py-12 bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Laptop,
                title: "Reception Kiosk",
                desc: "Walk-in visitors, courier drop-off & VIP guests.",
                badge: "Instant Token",
                path: "/kiosk",
                color: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/60",
              },
              {
                icon: GraduationCap,
                title: "Student Pass Portal",
                desc: "Digital gatepass, leaves, and curfew extensions.",
                badge: "Dynamic QR",
                path: "/app/student-pass",
                color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/60",
              },
              {
                icon: ScanLine,
                title: "Gate Checkpoint",
                desc: "Camera QR scanner with instant strike validation.",
                badge: "<50ms Scan",
                path: "/login",
                color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/60",
              },
              {
                icon: Building2,
                title: "Hostel Block A Hub",
                desc: "10-floor occupancy heatmap and night roll-call.",
                badge: "10 Floors",
                path: "/login",
                color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/60",
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  onClick={() => navigate(card.path)}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-900/90 border border-gray-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-sky-500/50 dark:hover:border-sky-500/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${card.color} transition-transform group-hover:scale-105`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-200/70 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                        {card.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                    <span>Launch Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">99.9%</p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mt-0.5">Gate Uptime</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">&lt; 50ms</p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mt-0.5">QR Verification</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">1,000</p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mt-0.5">Safe Campus Limit</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">09:30 PM</p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase mt-0.5">Night Curfew Radar</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50/50 dark:bg-slate-900/30 border-y border-gray-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-14">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50">
              Complete Feature Suite
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
              Engineered for Complete Campus Protection
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">
              Explore the 8 integrated modules managing every movement across academic zones, hostels, and campus gates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODULE_FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  onClick={() => navigate(f.path)}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                        {f.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                    <span>Explore Module</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
            Tailored Experiences
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
            Designed for Every Campus Stakeholder
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { key: "students", label: "🎓 Students & Residents" },
            { key: "guards", label: "🛡️ Security Guards" },
            { key: "wardens", label: "🏢 Hostel Wardens" },
            { key: "visitors", label: "👥 Visitors & Dignitaries" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveRoleTab(tab.key as any)}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${activeRoleTab === tab.key
                  ? "bg-sky-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:border-sky-500"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-lg">
          {activeRoleTab === "students" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  Student Life & Outings
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  Fast Digital Gatepass & Curfew Peace of Mind
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  No paper registers or manual signatures. Keep your digital student gatepass on your phone, request emergency curfew extensions in 1 tap, and track approved hostel leaves effortlessly.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Instant Dynamic QR Gatepass Generation
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Real-Time Curfew Countdowns & Leave Status
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> 1-Click Campus Emergency Check-In Beacon
                  </div>
                </div>
                <button
                  onClick={() => navigate("/student-pass")}
                  className="btn-primary !mt-4 !py-2.5 !px-6 text-sm"
                >
                  Open Student Portal →
                </button>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950 text-white font-mono text-xs space-y-3 shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-purple-400 font-bold">DIGITAL_GATEPASS.VMS</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">AUTHORIZED</span>
                </div>
                <p className="text-slate-400">STUDENT: Ram Krishna (BT23CSE026)</p>
                <p className="text-slate-400">HOSTEL: Block A, Rm 926 (4th Year CSE)</p>
                <p className="text-amber-400">CURFEW DEADLINE: 09:30 PM (IST)</p>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-sky-400 text-xs">DYNAMIC QR VALIDATED AT MAIN GATE</span>
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === "guards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  Security Checkpoints
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  Sub-Second Clearance & Defaulter Radar
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Security personnel scan QR codes directly using device cameras. The system automatically verifies visitor status, tracks 3-strike student curfew records, and flags overstaying guests.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> High-Speed Camera Viewfinder with Laser Scanner
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Automatic Curfew Delay & Disciplinary Calculation
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Blacklisted Individual Warning Radar
                  </div>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="btn-primary !mt-4 !py-2.5 !px-6 text-sm"
                >
                  Guard Scanner Login →
                </button>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950 text-white font-mono text-xs space-y-3 shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-emerald-400 font-bold">GATE_SCANNER_V2</span>
                  <span className="text-sky-400 text-[10px]">MAIN GATE CHECKPOINT</span>
                </div>
                <p className="text-slate-300">SCAN: STUDENT PASS VERIFIED (23ms)</p>
                <p className="text-emerald-400">STATUS: CLEARANCE GRANTED (NORMAL)</p>
                <p className="text-slate-400">LOGGED AT: 10:22 AM IST</p>
              </div>
            </div>
          )}

          {activeRoleTab === "wardens" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  Hostel Administration
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  10-Floor Occupancy & Automated Night Census
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Hostel Wardens get a birds-eye view of all 10 floors of Hostel Block A. Review night roll-calls, approve curfew extensions, verify parent consents, and export census CSVs with 1 click.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> 10-Floor Resident Occupancy Breakdown
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Automated 3-Strike Disciplinary Tracking
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> One-Click Night Roll-Call CSV Export
                  </div>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="btn-primary !mt-4 !py-2.5 !px-6 text-sm"
                >
                  Warden Office Login →
                </button>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950 text-white font-mono text-xs space-y-3 shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-indigo-400 font-bold">HOSTEL_BLOCK_A_CENSUS</span>
                  <span className="text-emerald-400 text-[10px]">96% INSIDE</span>
                </div>
                <p className="text-slate-300">TOTAL RESIDENTS: 400 STUDENTS</p>
                <p className="text-slate-300">DAY OUTINGS: 12 • LEAVES: 4</p>
                <p className="text-amber-400">CURFEW RADAR: ACTIVE (09:30 PM)</p>
              </div>
            </div>
          )}

          {activeRoleTab === "visitors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  Visitor Experience
                </span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                  VIP Clearance & Self-Service Check-In
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  Guests, recruiters, parents, and delivery personnel enjoy a fast self-service kiosk experience. Pre-register your visit or check in at the reception kiosk to receive a thermal badge token.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> 4 Fast-Pass Visit Types (Walk-in, Courier, Interview, VIP)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> Instant Photo Capture & Thermal Badge Generation
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> VIP Protocol Clearance for BoG & Recruiters
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => navigate("/kiosk")}
                    className="btn-primary !py-2.5 !px-6 text-sm"
                  >
                    Open Reception Kiosk →
                  </button>
                  <button
                    onClick={() => navigate("/request-visit")}
                    className="btn-secondary !py-2.5 !px-6 text-sm"
                  >
                    Pre-Register Visit
                  </button>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950 text-white font-mono text-xs space-y-3 shadow-2xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-amber-400 font-bold">RECEPTION_KIOSK_TOKEN</span>
                  <span className="text-emerald-400 text-[10px]">BADGE READY</span>
                </div>
                <p className="text-slate-300">GUEST: Academic Speaker / Recruiter</p>
                <p className="text-slate-300">PURPOSE: Campus Recruitment 2026</p>
                <p className="text-sky-400">ACCESS: Academic Block & BoG Boardroom</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-slate-50/50 dark:bg-slate-900/30 border-t border-gray-200/60 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50">
              Campus Guidelines
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-gray-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? "rotate-180 text-sky-500" : ""
                      }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed border-t border-gray-100 dark:border-slate-800">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-10 border-t border-gray-800 dark:border-slate-900 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-800 dark:border-slate-800">
            <div className="space-y-1">
              <Logo size="md" />
              <p className="text-gray-400 text-xs">
                IIIT Nagpur VMS — Smart Visitor & Campus Security System
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold">
              <button onClick={() => navigate("/kiosk")} className="text-gray-300 hover:text-white transition-colors">
                Reception Kiosk
              </button>
              <button onClick={() => navigate("/app/student-pass")} className="text-gray-300 hover:text-white transition-colors">
                Student Pass
              </button>
              <button onClick={() => navigate("/request-visit")} className="text-gray-300 hover:text-white transition-colors">
                Request Visit
              </button>
              <button onClick={() => navigate("/login")} className="text-gray-300 hover:text-white transition-colors">
                Log In
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} IIIT Nagpur VMS. All rights reserved.</p>
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Main Gate & Hostel Block A Online</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
export { Home };

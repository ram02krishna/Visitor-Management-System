import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { 
  QrCode, 
  CalendarDays, 
  Send, 
  ShieldCheck, 
  Printer,
  GraduationCap,
  Clock,
  Bike,
  X
} from "lucide-react";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import { PageHeader } from "./PageHeader";
import { CustomSelect } from "./ui/CustomSelect";
import { SEOMeta } from "./SEOMeta";
import QRCode from "qrcode";

export function StudentPassPortal() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"pass" | "leave" | "vehicles">("pass");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");


  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extMinutes, setExtMinutes] = useState(30);
  const [extReason, setExtReason] = useState("");
  const [extSubmitting, setExtSubmitting] = useState(false);
  const [myExtensions, setMyExtensions] = useState<any[]>([]);


  const [myVehicles, setMyVehicles] = useState<any[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleType, setVehicleType] = useState("two_wheeler");
  const [vehicleModel, setVehicleModel] = useState("");
  const [parkingSlot, setParkingSlot] = useState("");
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);


  const [curfewCountdown, setCurfewCountdown] = useState({
    hours: 0,
    mins: 0,
    isPast: false,
    label: "Calculating..."
  });


  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      let hour = 0;
      let minute = 0;
      for (const p of parts) {
        if (p.type === "hour") hour = parseInt(p.value, 10);
        if (p.type === "minute") minute = parseInt(p.value, 10);
      }
      if (hour === 24) hour = 0;


      const currentISTMinutes = hour * 60 + minute;
      const curfewISTMinutes = 21 * 60 + 30; // 21:30 IST is 1290 mins

      const diffMinutes = curfewISTMinutes - currentISTMinutes;
      if (diffMinutes <= 0) {
        setCurfewCountdown({ hours: 0, mins: 0, isPast: true, label: "Curfew Active (09:30 PM Past)" });
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        setCurfewCountdown({
          hours,
          mins,
          isPast: false,
          label: `${hours}h ${mins}m left until 09:30 PM Curfew`
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 10000);
    return () => clearInterval(interval);
  }, []);


  const studentCacheKey = user?.id ? `vms_student_profile_${user.id}` : "vms_student_profile";
  const [studentInfo, setStudentInfo] = useState(() => {
    return api.uiCache.get(studentCacheKey) || {
      roll_number: user?.roll_number || "",
      name: user?.name || "",
      email: user?.email || "",
      hostel_block: "Hostel Block A",
      room_number: "",
      branch: "CSE",
      phone: "",
      status: "inside"
    };
  });


  useEffect(() => {
    if (user?.role !== "student") return;
    const searchParam = user?.roll_number || user?.email;
    if (searchParam) {
      api.students.list({ search: searchParam, limit: 1 })
        .then((res) => {
          if (res.students && res.students.length > 0) {
            const s = res.students[0];
            const profile = {
              roll_number: s.roll_number,
              name: s.name,
              email: s.email,
              hostel_block: s.hostel_block || "Hostel Block A",
              room_number: s.room_number || "",
              branch: s.branch || "CSE",
              phone: s.phone || "",
              status: s.status
            };
            setStudentInfo(profile);
            api.uiCache.set(studentCacheKey, profile);
          }
        })
        .catch(() => {});
    }
  }, [user, studentCacheKey]);






  const [leaveType, setLeaveType] = useState("vacation");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);


  useEffect(() => {
    const payload = JSON.stringify({
      type: "student_gate_pass",
      rollNumber: studentInfo.roll_number,
      name: studentInfo.name,
      email: studentInfo.email,
      timestamp: Date.now()
    });

    QRCode.toDataURL(payload, { width: 300, margin: 2 }, (err, url) => {
      if (!err && url) {
        setQrCodeUrl(url);
      }
    });
  }, [studentInfo]);


  useEffect(() => {
    api.students.listLeaves({ student_id: undefined })
      .then((data) => setMyLeaves(data))
      .catch(() => {});

    api.students.listCurfewExtensions()
      .then((data) => setMyExtensions(data))
      .catch(() => {});

    if (studentInfo.roll_number) {
      api.vehicles.list({ search: studentInfo.roll_number })
        .then((data) => setMyVehicles(data))
        .catch(() => {});
    }
  }, [studentInfo.roll_number]);


  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !destination || !reason) {
      toast.error("Please fill in all leave details");
      return;
    }

    setSubmitting(true);
    try {
      await api.students.createLeave({
        roll_number: studentInfo.roll_number,
        leave_type: leaveType,
        from_date: new Date(fromDate).toISOString(),
        to_date: new Date(toDate).toISOString(),
        destination,
        reason
      });

      toast.success("Leave application submitted to Warden for review!");
      setFromDate("");
      setToDate("");
      setDestination("");
      setReason("");
      api.students.listLeaves().then(setMyLeaves);
      setActiveTab("leave");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Student Campus Pass & Leave" />

      <PageHeader
        backTo={user ? "/app/dashboard" : "/"}
        icon={QrCode}
        gradient="from-sky-500 to-indigo-600"
        title="Student Pass Portal"
        description="Digital gatepasses, curfew extension requests, and approved campus leave records."
      />


      {user?.role !== "student" ? (
        <div className="mt-8 p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            Student Pass Portal is Exclusive to Students
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            This digital gatepass portal is only available for accounts with the <strong>Student</strong> role. Staff roles (Admin, Hostel Warden, Security Guard, Host) and visitors manage passes and records through their respective dedicated portals.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/app/dashboard")}
              className="btn btn-primary text-xs font-bold px-6 py-2.5 rounded-xl shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <>

          <div
            className={`mt-5 p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
              curfewCountdown.isPast
                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                : curfewCountdown.hours < 2
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-2xl text-white shadow-sm ${
                  curfewCountdown.isPast ? "bg-red-600 animate-pulse" : "bg-emerald-600"
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Daily Hostel Curfew Status (09:30 PM IST)
                </span>
                <p className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                  {curfewCountdown.label}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowExtensionModal(true)}
              className="btn btn-sm btn-secondary text-xs font-bold whitespace-nowrap self-end sm:self-auto shadow-xs"
            >
              <Clock className="w-4 h-4 text-amber-500" /> Request Late Extension
            </button>
          </div>


          <div className="flex border-b border-gray-200 dark:border-slate-800 mt-6 space-x-2 sm:space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("pass")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "pass"
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4" /> My Campus Pass
            </button>

            <button
              onClick={() => setActiveTab("leave")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "leave"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Request Vacation Leave
            </button>

            <button
              onClick={() => setActiveTab("vehicles")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "vehicles"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Bike className="w-4 h-4" /> Vehicle / Bike Pass
            </button>
          </div>
        </>
      )}

      {user?.role === "student" && activeTab === "pass" && (
        <div className="mt-8 flex flex-col items-center">

          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 shadow-2xl border border-indigo-500/30 relative overflow-hidden">

            <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />


            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                  Indian Institute of Information Technology
                </span>
                <h3 className="text-base font-black tracking-tight mt-0.5">RESIDENT STUDENT ID</h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>


            <div className="flex flex-col items-center py-5">
              <div className="p-3.5 bg-white rounded-2xl shadow-xl ring-4 ring-sky-500/30">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Student QR Pass" className="w-44 h-44 sm:w-48 sm:h-48" />
                ) : (
                  <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-gray-400 text-sm">
                    Generating pass...
                  </div>
                )}
              </div>

              <span className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                INSIDE CAMPUS (READY FOR OUTING)
              </span>
            </div>


            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs font-medium uppercase">Student Name</span>
                <span className="font-bold text-white text-sm">{studentInfo.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs font-medium uppercase">Roll Number</span>
                <span className="font-mono font-bold text-sky-300 text-sm">{studentInfo.roll_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs font-medium uppercase">Program</span>
                <span className="font-medium text-sky-200 text-sm">4-Year B.Tech ({studentInfo.branch})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs font-medium uppercase">Hostel Block</span>
                <span className="font-medium text-white text-sm">{studentInfo.hostel_block}, Rm {studentInfo.room_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-xs font-medium uppercase">Student Phone</span>
                <span className="font-mono font-medium text-slate-200 text-sm">{studentInfo.phone || "—"}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-slate-300 text-xs font-medium uppercase">Daily Curfew In-Time</span>
                <span className="font-bold text-amber-300 text-sm">09:30 PM (IST)</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3.5">
              Present this QR pass to security guards at checkpoint gates.
            </p>
          </div>


          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="btn btn-secondary text-xs sm:text-sm font-bold shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-500" /> Print Official GatePass
            </button>
            <button
              onClick={() => setShowExtensionModal(true)}
              className="btn btn-primary text-xs sm:text-sm font-bold shadow-sm"
            >
              <Clock className="w-4 h-4" /> Request Late Extension
            </button>
          </div>
        </div>
      )}




      {activeTab === "leave" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" /> Apply for Multi-Day Leave
            </h3>


            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-xs mb-1.5">
                  Leave Category
                </label>
                <CustomSelect
                  value={leaveType}
                  onChange={setLeaveType}
                  options={[
                    { value: "vacation", label: "Semester Break / Vacation" },
                    { value: "home_visit", label: "Weekend Home Visit" },
                    { value: "medical", label: "Medical Leave" },
                    { value: "festival", label: "Festival Leave" }
                  ]}
                  className="!py-2.5 !px-3 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-xs mb-1.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-sm outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-xs mb-1.5">
                    Expected Return Date
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-sm outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-xs mb-1.5">
                  Destination City / Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Address (Nagpur / Pune / Delhi)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-sm outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-xs mb-1.5">
                  Reason for Leave
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for extended leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-sm outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn btn-primary py-3 text-sm font-bold justify-center shadow-md"
              >
                <Send className="w-4 h-4" /> Submit to Warden for Approval
              </button>
            </form>
          </div>


          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
              Leave History & Status
            </h3>

            {myLeaves.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No leave applications submitted yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {myLeaves.map((l) => (
                  <div key={l.id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm capitalize text-gray-900 dark:text-white">
                        {l.leave_type.replace("_", " ")}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                          l.status === "approved"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : l.status === "rejected"
                            ? "bg-red-50 text-red-600 dark:text-red-900/30 dark:text-red-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {formatIST(l.from_date)} &rarr; {formatIST(l.to_date)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{l.destination} • {l.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      )}


      {activeTab === "vehicles" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Bike className="w-4 h-4 text-purple-500" /> Register Vehicle / Two-Wheeler
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!vehiclePlate) return toast.error("License plate required");
                setVehicleSubmitting(true);
                try {
                  await api.vehicles.register({
                    roll_number: studentInfo.roll_number,
                    owner_name: studentInfo.name,
                    vehicle_type: vehicleType,
                    license_plate: vehiclePlate,
                    vehicle_model: vehicleModel,
                    parking_slot: parkingSlot
                  });
                  toast.success(`Vehicle pass registered for ${vehiclePlate}!`);
                  setVehiclePlate("");
                  setVehicleModel("");
                  setParkingSlot("");
                  api.vehicles.list({ search: studentInfo.roll_number }).then(setMyVehicles);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Failed to register vehicle");
                } finally {
                  setVehicleSubmitting(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Vehicle Type
                </label>
                <CustomSelect
                  value={vehicleType}
                  onChange={setVehicleType}
                  options={[
                    { value: "two_wheeler", label: "Two-Wheeler (Motorcycle / Scooter / EV)" },
                    { value: "four_wheeler", label: "Car / Four-Wheeler" },
                    { value: "bicycle", label: "Bicycle" }
                  ]}
                  className="!py-2.5 !px-3 text-xs font-bold"
                />
              </div>


              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                  Vehicle License Plate Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH 31 AB 1234"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs font-mono font-bold uppercase outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Model / Make
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Honda Activa 6G"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 uppercase text-[10px] mb-1">
                    Hostel Parking Slot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block A Slot P-12"
                    value={parkingSlot}
                    onChange={(e) => setParkingSlot(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs outline-none dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={vehicleSubmitting}
                className="w-full btn btn-primary py-2.5 text-xs font-bold justify-center"
              >
                <Bike className="w-3.5 h-3.5" /> Issue Authorized Parking Pass
              </button>
            </form>
          </div>


          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              My Registered Vehicles
            </h3>

            {myVehicles.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                <Bike className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No vehicles registered under Roll No {studentInfo.roll_number}.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {myVehicles.map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-black text-gray-900 dark:text-white">{v.license_plate}</p>
                      <p className="text-[11px] text-gray-500">{v.vehicle_model || v.vehicle_type} • Slot: {v.parking_slot || "General"}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Authorized
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {showExtensionModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col animate-scaleIn my-auto">
              <button
                onClick={() => setShowExtensionModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 dark:bg-amber-500/15 dark:border-amber-500/30 dark:shadow-[0_0_16px_-2px_rgba(245,158,11,0.35)] text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Emergency Curfew Extension</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Request Warden approval for late campus entry without strike</p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!extReason.trim()) return toast.error("Please provide a reason");
                  setExtSubmitting(true);
                  try {
                    const res = await api.students.requestCurfewExtension({
                      roll_number: studentInfo.roll_number,
                      additional_minutes: extMinutes,
                      reason: extReason
                    });
                    toast.success(res.message || "Curfew extension request submitted!");
                    setShowExtensionModal(false);
                    setExtReason("");
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "Failed to submit request");
                  } finally {
                    setExtSubmitting(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Additional Time Needed</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setExtMinutes(m)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          extMinutes === m
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20"
                            : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        +{m} Mins
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Reason for Extension <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={extReason}
                    onChange={(e) => setExtReason(e.target.value)}
                    placeholder="e.g. College Hackathon project lab session / delayed by traffic / hospital visit"
                    className="w-full py-2.5 px-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 text-xs outline-none dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExtensionModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={extSubmitting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {extSubmitting ? "Submitting..." : "Submit to Warden"}
                  </button>
                </div>
              </form>

              {myExtensions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
                  <h5 className="text-[10px] font-black uppercase text-gray-400">Recent Extension Requests</h5>
                  {myExtensions.slice(0, 3).map((ext) => (
                    <div key={ext.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-700 dark:text-slate-300">+{ext.additional_minutes}m ({ext.reason})</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        ext.status === "approved" ? "bg-emerald-100 text-emerald-700" : ext.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {ext.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}


import { useState, useEffect, useCallback } from "react";
import { AlertOctagon, CheckCircle2, PhoneCall, ShieldAlert, X, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";
import { useDataSync } from "../lib/dataSync";
import { CustomSelect } from "./ui/CustomSelect";

export function EmergencyBanner() {
  const { user } = useAuthStore();
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCensusModal, setShowCensusModal] = useState(false);
  const [census, setCensus] = useState<any>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [myLocation, setMyLocation] = useState("Hostel Block A");

  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("critical");
  const [broadcasting, setBroadcasting] = useState(false);

  const isAuthority = user?.role === "admin" || user?.role === "guard" || user?.role === "host";

  const fetchAlert = useCallback(async () => {
    try {
      const data = await api.emergency.getActive();
      setActiveAlert(data);
      if (data && user?.roll_number) {
        const alreadyChecked = data.checkins?.some((c: any) => c.roll_number === user.roll_number);
        setCheckedIn(!!alreadyChecked);
      }
    } catch {
    }
  }, [user]);

  useDataSync(["visits", "all"], () => {
    fetchAlert();
  });

  useEffect(() => {
    fetchAlert();
    const interval = setInterval(fetchAlert, 6000);
    return () => clearInterval(interval);
  }, [fetchAlert]);

  const handleCheckin = async (status: "safe" | "need_help") => {
    if (!activeAlert) return;
    try {
      await api.emergency.checkin({
        alert_id: activeAlert.id,
        status,
        location: myLocation,
        roll_number: user?.roll_number || undefined,
        name: user?.name
      });

      setCheckedIn(true);
      toast.success(status === "need_help" ? "Assistance request sent to Campus Security!" : "Marked safe on campus census!");
      fetchAlert();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle || !alertMessage) {
      toast.error("Please fill in alert details");
      return;
    }

    setBroadcasting(true);
    try {
      await api.emergency.broadcastAlert({
        title: alertTitle,
        message: alertMessage,
        severity: alertSeverity
      });
      toast.success("Campus Emergency Broadcasted!");
      setShowBroadcastModal(false);
      setAlertTitle("");
      setAlertMessage("");
      fetchAlert();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleResolve = async () => {
    try {
      await api.emergency.resolveAlert();
      toast.success("Emergency Alert resolved.");
      setActiveAlert(null);
      fetchAlert();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  };

  const openCensus = async () => {
    if (!activeAlert) return;
    try {
      const data = await api.emergency.getCensus(activeAlert.id);
      setCensus(data);
      setShowCensusModal(true);
    } catch {
      toast.error("Failed to load emergency headcount");
    }
  };

  return (
    <>
      {activeAlert && (
        <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl py-3 px-4 sm:px-6 relative z-40 animate-fadeIn border-b-2 border-red-400/40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 animate-pulse shrink-0">
                <AlertOctagon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white text-red-700">
                    {activeAlert.severity.toUpperCase()} ALERT
                  </span>
                  <h4 className="text-sm font-black tracking-tight">{activeAlert.title}</h4>
                </div>
                <p className="text-xs text-red-100 font-medium mt-0.5">{activeAlert.message}</p>
              </div>
            </div>

            {user?.role === "student" && !checkedIn && (
              <div className="flex items-center gap-2 self-end md:self-auto">
                <select
                  value={myLocation}
                  onChange={(e) => setMyLocation(e.target.value)}
                  className="bg-black/30 text-white border border-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                >
                  <option value="Hostel Block A">Hostel Block A</option>
                  <option value="Academic Block">Academic Block</option>
                  <option value="Central Library">Central Library</option>
                  <option value="Outside Campus">Outside Campus</option>
                </select>
                <button
                  onClick={() => handleCheckin("safe")}
                  className="btn btn-sm bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md border-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> I Am Safe
                </button>
                <button
                  onClick={() => handleCheckin("need_help")}
                  className="btn btn-sm bg-black/60 hover:bg-black text-amber-300 text-xs font-black shadow-md border border-amber-300/40 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-amber-400" /> Need Help
                </button>
              </div>
            )}

            {user?.role === "student" && checkedIn && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black uppercase tracking-wider self-end md:self-auto">
                <CheckCircle2 className="w-4 h-4" /> You Are Marked Safe
              </span>
            )}

            {isAuthority && (
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={openCensus}
                  className="btn btn-sm bg-white/20 hover:bg-white/30 text-white text-xs font-bold border-0 cursor-pointer"
                >
                  Headcount ({activeAlert.checkins?.length || 0})
                </button>
                <button
                  onClick={handleResolve}
                  className="btn btn-sm bg-white text-red-700 hover:bg-red-50 text-xs font-black border-0 shadow-xs cursor-pointer"
                >
                  Resolve Alert
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeAlert && isAuthority && (
        <div
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-4 lg:right-6 z-[60] animate-fadeIn"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full lg:rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs sm:text-sm shadow-xl shadow-red-600/40 border border-red-400/40 active:scale-95 transition-all cursor-pointer"
            title="Broadcast Campus Emergency / Lockdown"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse text-white" />
            <span>Broadcast SOS</span>
          </button>
        </div>
      )}

      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-red-500/40 shadow-xl p-6 relative">
            <button
              onClick={() => setShowBroadcastModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Campus Emergency Broadcast</h3>
                <p className="text-[11px] text-gray-400">Pushes immediate siren alert to all student passes & kiosks</p>
              </div>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Alert Category</label>
                <CustomSelect
                  value={alertSeverity}
                  onChange={setAlertSeverity}
                  options={[
                    { value: "critical", label: "🚨 Critical Emergency (Fire / Intrusion / Natural)" },
                    { value: "warning", label: "⚠️ Campus Lockdown / Security Precaution" },
                    { value: "drill", label: "📢 Scheduled Evacuation Safety Drill" }
                  ]}
                  className="!py-2.5 !px-3 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="e.g. CAMPUS EVACUATION ALERT - HOSTEL BLOCK A"
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Instructions for Students & Staff</label>
                <textarea
                  required
                  rows={3}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="e.g. Please proceed immediately to Assembly Ground 1. Mark yourself safe on your student pass portal."
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 btn-secondary text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="flex-1 btn bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs cursor-pointer py-2.5 rounded-xl"
                >
                  {broadcasting ? "Broadcasting..." : "Issue Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCensusModal && census && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowCensusModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Emergency Census & Rescue Telemetry
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Marked Safe</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{census.safeCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-500/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Need Help</span>
                <p className="text-xl font-black text-red-600 dark:text-red-400">{census.needHelpCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Unaccounted</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">{census.pendingCount}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 space-y-2 pr-1">
              {census.checkins?.map((c: any) => (
                <div key={c.id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{c.name} <span className="font-mono text-gray-400">({c.roll_number})</span></p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-sky-500" /> {c.location}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${c.status === "safe" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700 animate-pulse"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

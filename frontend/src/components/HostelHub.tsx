import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Home,
  LogOut,
  LogIn,
  CalendarDays,
  AlertTriangle,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
  Phone,
  Clock,
  Building,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  ShieldCheck,
  Download,
  Bike,
  FileText,
  Plus,
  Trash2,
  Pencil,
  X,
  Circle
} from "lucide-react";

import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import { PageHeader } from "./PageHeader";
import { SEOMeta } from "./SEOMeta";
import { useDataSync, dataSync } from "../lib/dataSync";
import { CustomSelect } from "./ui/CustomSelect";
import { useDebounce } from "../hooks/useDebounce";
import Papa from "papaparse";

function formatBranchName(branch?: string): string {
  if (!branch) return "";
  const b = branch.toUpperCase();
  if (b.includes("HCI") || b.includes("HUMAN")) return "B.Tech HCI";
  if (b.includes("CSA") || b.includes("ARTIFICIAL")) return "B.Tech CSA";
  if (b.includes("ECE") || b.includes("ELECTRONIC")) return "B.Tech ECE";
  if (b.includes("CSE") || b.includes("COMPUTER")) return "B.Tech CSE";
  if (b.includes("MECH")) return "B.Tech ME";
  if (b.includes("CIVIL")) return "B.Tech CE";
  if (b.includes("EE") || b.includes("ELECTRICAL")) return "B.Tech EE";
  return b.startsWith("B.TECH") ? branch : `B.Tech ${branch}`;
}

export function HostelHub() {
  const [activeTab, setActiveTab] = useState<"radar" | "heatmap" | "extensions" | "vehicles" | "leaves" | "directory" | "movements">("radar");


  const [census, setCensus] = useState(() => api.uiCache.get("vms_hostel_census") || {
    total: 0,
    inside: 0,
    out_day: 0,
    on_leave: 0,
    overdue: 0,
    blocks: [] as Array<{ hostel_block: string; status: string; _count: { _all: number } }>
  });


  const [floorCensus, setFloorCensus] = useState<any>(() => api.uiCache.get("vms_floor_census") || null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);


  const [overdueList, setOverdueList] = useState<any[]>(() => api.uiCache.get("vms_hostel_overdue") || []);


  const [extensions, setExtensions] = useState<any[]>([]);


  const [vehicles, setVehicles] = useState<any[]>(() => api.uiCache.get("vms_hostel_vehicles") || []);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const debouncedVehicleSearch = useDebounce(vehicleSearch, 400);


  const [leaves, setLeaves] = useState<any[]>(() => api.uiCache.get("vms_hostel_leaves") || []);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("pending");


  const [students, setStudents] = useState<any[]>(() => api.uiCache.get("vms_hostel_students") || []);
  const [studentSearch, setStudentSearch] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearch, 400);
  const [totalStudents, setTotalStudents] = useState(0);


  const [dossierStudent, setDossierStudent] = useState<any>(null);
  const [dossierLogs, setDossierLogs] = useState<any[]>([]);
  const [newActionType, setNewActionType] = useState("warning");
  const [newRemarks, setNewRemarks] = useState("");



  const [movements, setMovements] = useState<any[]>([]);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementGateFilter, setMovementGateFilter] = useState("");
  const [movementStatusFilter, setMovementStatusFilter] = useState("");


  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingCensus, setExportingCensus] = useState(false);


  const handleExportCensus = async () => {
    try {
      setExportingCensus(true);
      await api.students.exportCensusCsv();
      toast.success("Hostel Roll-Call Census exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export census");
    } finally {
      setExportingCensus(false);
    }
  };


  const fetchAllData = useCallback(async () => {
    try {
      const [censusData, floorData, overdueData, extData, vehiclesData, leavesData, directoryData, movementsData] = await Promise.all([
        api.students.getCensus(),
        api.students.getFloorCensus().catch(() => null),
        api.students.getOverdue(),
        api.students.listCurfewExtensions().catch(() => []),
        api.vehicles.list({ search: debouncedVehicleSearch || undefined }).catch(() => []),
        api.students.listLeaves({ status: leaveStatusFilter || undefined }),
        api.students.list({ search: debouncedStudentSearch || undefined, limit: 100 }),
        api.students.listMovements({ limit: 50 })
      ]);

      setCensus(censusData);
      setFloorCensus(floorData);
      setOverdueList(overdueData);
      setExtensions(extData);
      setVehicles(vehiclesData);
      setLeaves(leavesData);
      setStudents(directoryData.students);
      setTotalStudents(directoryData.total);
      setMovements(movementsData);

      api.uiCache.set("vms_hostel_census", censusData);
      if (floorData) api.uiCache.set("vms_floor_census", floorData);
      api.uiCache.set("vms_hostel_overdue", overdueData);
      if (!debouncedVehicleSearch) api.uiCache.set("vms_hostel_vehicles", vehiclesData);
      if (!debouncedStudentSearch) api.uiCache.set("vms_hostel_students", directoryData.students);
      api.uiCache.set("vms_hostel_leaves", leavesData);
    } catch {
      toast.error("Failed to sync hostel data");
    }
  }, [leaveStatusFilter, debouncedStudentSearch, debouncedVehicleSearch]);

  useDataSync(["students", "visits", "all"], () => {
    fetchAllData();
  });

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(() => fetchAllData(), 8000);
    return () => clearInterval(timer);
  }, [fetchAllData]);


  const handleLeaveAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await api.students.updateLeave(id, status);
      toast.success(`Leave request ${status} successfully`);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update leave");
    }
  };


  const handleParentConsent = async (id: string, consent: "verified" | "pending" | "exempted") => {
    try {
      await api.students.updateParentConsent(id, consent);
      toast.success(`Parent consent status updated to "${consent}"`);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update parent consent");
    }
  };


  const handleExtensionAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await api.students.updateCurfewExtension(id, status);
      toast.success(`Curfew Extension ${status}`);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update curfew extension");
    }
  };


  const handleRevokeVehicle = async (id: string) => {
    try {
      await api.vehicles.revoke(id);
      toast.success("Vehicle pass revoked");
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke vehicle");
    }
  };


  const handleResetStrikes = async (studentId: string, studentName: string) => {
    try {
      await api.students.resetStrikes(studentId);
      toast.success(`Curfew strikes reset for ${studentName}`);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset strikes");
    }
  };


  const handleCheckInStudent = async (rollNumber: string, name: string) => {
    try {
      const res = await api.students.scanPass({
        scanData: rollNumber,
        gate: "Main Gate"
      });
      toast.success(res.message || `Entry logged for ${name} — Student marked Inside Campus.`);
      fetchAllData();
      dataSync.notify("students");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to log entry");
    }
  };


  const openDossier = async (student: any) => {
    setDossierStudent(student);
    try {
      const logs = await api.students.listDisciplinaryLogs(student.id);
      setDossierLogs(logs);
    } catch {
      toast.error("Failed to load disciplinary dossier");
    }
  };



  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    hostel_block: "Hostel Block A",
    room_number: "",
    branch: "CSE",
    year: 4,
    parent_name: "",
    parent_phone: "",
    status: "inside",
    late_strike_count: 0
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleOpenEdit = (student: any) => {
    setEditingStudent(student);
    setEditForm({
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      hostel_block: student.hostel_block || "Hostel Block A",
      room_number: student.room_number || "",
      branch: student.branch || "CSE",
      year: student.year || 1,
      parent_name: student.parent_name || "",
      parent_phone: student.parent_phone || "",
      status: student.status || "inside",
      late_strike_count: student.late_strike_count || 0
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditSubmitting(true);
    try {
      await api.students.updateStudent(editingStudent.id, editForm);
      toast.success(`Updated details for ${editForm.name}`);
      setEditingStudent(null);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update student details");
    } finally {
      setEditSubmitting(false);
    }
  };


  const handleAddDossierEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarks.trim() || !dossierStudent) return;
    try {
      await api.students.addDisciplinaryLog(dossierStudent.id, {
        action_type: newActionType,
        remarks: newRemarks
      });
      toast.success("Disciplinary action recorded.");
      setNewRemarks("");
      const logs = await api.students.listDisciplinaryLogs(dossierStudent.id);
      setDossierLogs(logs);
      fetchAllData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record entry");
    }
  };





  const handleCsvUpload = (file: File) => {
    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await api.students.bulkUpload(results.data as any[]);
          toast.success(res.message || "Students onboarded successfully!");
          setShowUploadModal(false);
          fetchAllData();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "CSV processing failed");
        } finally {
          setUploading(false);
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file");
        setUploading(false);
      }
    });
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Hostel Hub & Campus Outings" />

      <PageHeader
        backTo="/app/dashboard"
        icon={Building}
        gradient="from-indigo-600 to-sky-600"
        title="Hostel Hub"
        description="Resident occupancy, night curfew monitoring, and student outing records."
        right={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCensus}
              disabled={exportingCensus}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-sky-500 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {exportingCensus ? (
                <Circle className="animate-spin w-4 h-4 text-sky-500" />
              ) : (
                <Upload className="w-4 h-4 text-sky-500" />
              )}
              <span>Export Roll-Call CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Bulk CSV Import</span>
            </button>
          </div>
        }
      />


      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Resident</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {census.total}
          </p>
          <span className="text-xs font-medium text-gray-400">Enrolled Students</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Inside Campus</span>
            <Home className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {census.inside}
          </p>
          <span className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">
            In Hostel / Labs
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Day Outing</span>
            <LogOut className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {census.out_day}
          </p>
          <span className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">
            {census.overdue > 0 ? `${census.overdue} past 09:30 PM curfew` : "Out on short pass"}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs">
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">On Leave</span>
            <CalendarDays className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {census.on_leave}
          </p>
          <span className="text-xs font-medium text-indigo-600/70 dark:text-indigo-400/70">
            Vacation / Break
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-500/40 bg-red-50/30 dark:bg-red-950/30 shadow-xs">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Curfew Overdue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {census.overdue}
          </p>
          <span className="text-xs font-medium text-red-600/70 dark:text-red-400/70">
            Past 09:30 PM Curfew
          </span>
        </div>
      </div>


      <div className="flex border-b border-gray-200 dark:border-slate-800 mt-8 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab("radar")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "radar"
              ? "border-red-500 text-red-600 dark:text-red-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Curfew 3-Strike Radar ({overdueList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("heatmap")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "heatmap"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hostel Floor Heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab("extensions")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "extensions"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Clock className="w-4 h-4" />
          <span>Curfew Extensions ({extensions.filter(e => e.status === "pending").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("vehicles")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "vehicles"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Bike className="w-4 h-4" />
          <span>Vehicle Passes ({vehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "leaves"
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Vacation Leaves ({leaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("directory")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "directory"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory ({totalStudents})</span>
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "movements"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
              : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Clock className="w-4 h-4" />
          <span>Gate Telemetry Log</span>
        </button>
      </div>




      {activeTab === "radar" && (
        <div className="mt-6 space-y-4">
          {overdueList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">All Students Accounted For</h3>
              <p className="text-xs text-gray-400 mt-1">No students are currently out past the 09:30 PM campus curfew.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 overflow-hidden shadow-sm">
              {overdueList.map((item) => {
                const strikeCount = item.student.late_strike_count || 1;
                const isFlagged = item.student.is_flagged || strikeCount >= 3;

                return (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-red-50/20 dark:bg-red-950/10 hover:bg-red-50/35 dark:hover:bg-red-950/20 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm text-white ${isFlagged ? "bg-purple-600 animate-pulse" : "bg-red-600"
                        }`}>
                        {item.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-gray-900 dark:text-white truncate">{item.student.name}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 uppercase shrink-0">
                            Overdue
                          </span>
                          {isFlagged ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1 shrink-0">
                              🚨 Habitual Defaulter (3/3 Strikes)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase shrink-0">
                              ⚠️ Strike {strikeCount}/3
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                          {item.student.roll_number} • {item.student.hostel_block}, Rm {item.student.room_number} • {formatBranchName(item.student.branch)}
                        </p>
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1">
                          Exited: {formatIST(item.exit_time)} • Expected In: {formatIST(item.expected_in)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-stretch xl:self-auto justify-start xl:justify-end">
                      <button
                        onClick={() => handleCheckInStudent(item.student.roll_number, item.student.name)}
                        className="btn btn-sm btn-primary text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                        title="Log campus entry and update Inside Campus count"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Check In / Return
                      </button>
                      <a
                        href={`tel:${item.student.phone}`}
                        className="btn btn-sm btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap"
                        title={`Call Student: ${item.student.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-sky-500" /> Student: {item.student.phone}
                      </a>
                      <a
                        href={`tel:${item.student.parent_phone}`}
                        className="btn btn-sm btn-danger text-xs flex items-center gap-1.5 whitespace-nowrap"
                        title={`Call Parent: ${item.student.parent_phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" /> Parent: {item.student.parent_phone}
                      </a>
                      {strikeCount > 0 && (
                        <button
                          onClick={() => handleResetStrikes(item.student.id, item.student.name)}
                          title="Pardon / Reset Curfew Strikes"
                          className="btn btn-sm btn-outline text-xs text-gray-600 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap hover:text-amber-600 hover:border-amber-400"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-500" /> Reset Strikes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {activeTab === "heatmap" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Hostel Block A — 10 Floors Live Telemetry</h3>
              <p className="text-xs text-gray-400 mt-0.5">Floor 1 (Girls Only) • Floors 2–10 (Boys partitioned by academic batch)</p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-3 py-1 rounded-xl">
              Live Night Roll-Call Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {floorCensus?.floors?.map((fl: any) => {
              const isSelected = selectedFloor === fl.floor;
              return (
                <div
                  key={fl.floor}
                  onClick={() => setSelectedFloor(isSelected ? null : fl.floor)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                      ? "border-sky-500 bg-sky-50/20 dark:bg-sky-950/20 ring-2 ring-sky-500/20 shadow-md"
                      : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-gray-900 dark:text-white">Floor {fl.floor}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fl.occupancyRate >= 90
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                      {fl.occupancyRate}% In
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 truncate">
                    {fl.description}
                  </p>

                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Inside</span>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{fl.inside}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Out</span>
                      <p className="text-xs font-black text-amber-600 dark:text-amber-400">{fl.out_day}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Leave</span>
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{fl.on_leave}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


          {selectedFloor !== null && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-500/30 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-gray-900 dark:text-white">
                  Residents of Floor {selectedFloor} (
                  {floorCensus?.floors?.find((f: any) => f.floor === selectedFloor)?.description})
                </h4>
                <button
                  onClick={() => setSelectedFloor(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  Close View ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {floorCensus?.floors
                  ?.find((f: any) => f.floor === selectedFloor)
                  ?.students?.map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-black text-gray-900 dark:text-white">{st.name}</p>
                        <p className="text-[11px] font-mono text-gray-500">
                          {st.roll_number} • Rm {st.room_number}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${st.status === "inside"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : st.status === "out_day"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          }`}
                      >
                        {st.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}


      {activeTab === "leaves" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setLeaveStatusFilter(s)}
                className={`btn btn-sm capitalize ${leaveStatusFilter === s ? "btn-primary" : "btn-secondary"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {leaves.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
              <CalendarDays className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No {leaveStatusFilter} leave requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {leaves.map((leave) => (
                <div key={leave.id} className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-gray-900 dark:text-white">{leave.student.name}</p>
                      <span className="font-mono text-xs text-gray-400">({leave.student.roll_number})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                        {leave.leave_type.replace("_", " ")}
                      </span>


                      {leave.parent_consent === "verified" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-3 h-3" /> Parent Consent Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <Phone className="w-3 h-3" /> Pending Parent Consent ({leave.student.parent_phone})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-bold text-gray-700 dark:text-slate-300">Duration:</span>{" "}
                      {formatIST(leave.from_date)} &rarr; {formatIST(leave.to_date)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-bold text-gray-700 dark:text-slate-300">Destination:</span> {leave.destination} • <span className="font-bold text-gray-700 dark:text-slate-300">Reason:</span> {leave.reason}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                    {leave.status === "pending" && leave.parent_consent !== "verified" && (
                      <button
                        onClick={() => handleParentConsent(leave.id, "verified")}
                        className="btn btn-sm btn-secondary text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verify Parent Call
                      </button>
                    )}

                    {leave.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleLeaveAction(leave.id, "approved")}
                          className="btn btn-sm btn-success text-xs font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve Pass
                        </button>
                        <button
                          onClick={() => handleLeaveAction(leave.id, "rejected")}
                          className="btn btn-sm btn-danger text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}



      {activeTab === "extensions" && (

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Curfew Late Extension Requests
            </h3>
            <span className="text-xs text-gray-400">
              Students requesting temporary curfew waiver (+30m / +60m)
            </span>
          </div>

          {extensions.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No curfew extension requests filed today.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extensions.map((ext) => (
                <div
                  key={ext.id}
                  className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-white">
                        {ext.student_name} <span className="font-mono text-gray-400 font-normal">({ext.roll_number})</span>
                      </h4>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        +{ext.additional_minutes} Minutes Extension Requested
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ext.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : ext.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                      {ext.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <strong>Reason:</strong> {ext.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span>Requested at: {formatIST(ext.created_at)}</span>

                    {ext.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExtensionAction(ext.id, "approved")}
                          className="btn btn-sm btn-success text-xs font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve (+{ext.additional_minutes}m)
                        </button>
                        <button
                          onClick={() => handleExtensionAction(ext.id, "rejected")}
                          className="btn btn-sm btn-danger text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {activeTab === "vehicles" && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Search plate (e.g. MH 31) or Roll No..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-sm font-medium text-gray-500">{vehicles.length} Registered Campus Vehicles</span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-sm divide-y divide-gray-100 dark:divide-slate-800 min-w-[700px]">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">License Plate</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Vehicle Type</th>
                  <th className="py-3.5 px-4">Model</th>
                  <th className="py-3.5 px-4">Parking Slot</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-purple-600 dark:text-purple-400">
                      {v.license_plate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                      {v.owner_name} {v.roll_number && <span className="font-mono text-gray-400 text-xs font-normal">({v.roll_number})</span>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap capitalize text-gray-600 dark:text-slate-300">
                      {v.vehicle_type.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-slate-300">
                      {v.vehicle_model || "—"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-slate-300 font-mono">
                      {v.parking_slot || "General"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRevokeVehicle(v.id)}
                        className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold"
                        title="Revoke Vehicle Gate Pass"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === "directory" && (
        <div className="mt-6 space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by Roll No, Name, Room..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-sm divide-y divide-gray-100 dark:divide-slate-800 min-w-[850px]">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Hostel & Room</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Student Phone</th>
                  <th className="py-3.5 px-4">Parent Phone</th>
                  <th className="py-3.5 px-4">Strikes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{st.name}</div>
                      <div className="font-mono text-xs flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-sky-600 dark:text-sky-400">{st.roll_number}</span>
                        <span className="text-gray-300 dark:text-slate-600">•</span>
                        <span className="text-gray-500 dark:text-slate-400">{st.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-slate-300 font-medium">
                      {st.hostel_block}, Rm {st.room_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-700 dark:text-slate-300 font-medium">
                      {formatBranchName(st.branch)}
                    </td>


                    <td className="py-3 px-4 whitespace-nowrap text-gray-900 dark:text-slate-100 font-mono font-medium">
                      {st.phone || "—"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-slate-400 font-mono">
                      {st.parent_phone}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${st.late_strike_count >= 3
                            ? "bg-red-100 text-red-700 animate-pulse"
                            : st.late_strike_count > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                      >
                        {st.late_strike_count}/3 Strikes
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(st)}
                        className="btn btn-sm btn-secondary text-xs font-bold py-1 px-2.5 shadow-xs"
                        title="Edit Student Profile"
                      >
                        <Pencil className="w-3.5 h-3.5 text-sky-500" /> Edit
                      </button>
                      <button
                        onClick={() => openDossier(st)}
                        className="btn btn-sm btn-secondary text-xs font-bold py-1 px-2.5 shadow-xs"
                        title="View Disciplinary Dossier"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> Dossier
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === "movements" && (() => {
        const formatGateName = (gate?: string | null) => {
          if (!gate) return "Main Gate";
          const lower = gate.toLowerCase();
          if (lower.includes("hostel")) return "Hostel Gate";
          if (lower.includes("academic") || lower.includes("main") || lower.includes("campus") || lower.includes("north") || lower.includes("south")) return "Main Gate";
          return gate;
        };

        const filteredMovements = movements.filter((m) => {
          const exitGateFormatted = formatGateName(m.exit_gate);
          const entryGateFormatted = m.entry_time ? formatGateName(m.entry_gate) : "";

          if (movementGateFilter) {
            if (exitGateFormatted !== movementGateFilter && entryGateFormatted !== movementGateFilter) {
              return false;
            }
          }

          if (movementStatusFilter) {
            if (movementStatusFilter === "active" && m.entry_time) return false;
            if (movementStatusFilter === "completed" && !m.entry_time) return false;
            if (movementStatusFilter === "overdue" && !m.is_overdue) return false;
          }

          if (movementSearch) {
            const q = movementSearch.toLowerCase().trim();
            const nameMatch = m.student?.name?.toLowerCase().includes(q);
            const rollMatch = m.student?.roll_number?.toLowerCase().includes(q);
            const typeMatch = m.movement_type?.toLowerCase().includes(q);
            const exitMatch = exitGateFormatted.toLowerCase().includes(q);
            const entryMatch = entryGateFormatted.toLowerCase().includes(q);
            const purposeMatch = m.purpose?.toLowerCase().includes(q);
            return nameMatch || rollMatch || typeMatch || exitMatch || entryMatch || purposeMatch;
          }

          return true;
        });

        return (
          <div className="mt-6 space-y-4">

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="Search by student name, roll number, purpose, or gate..."
                  className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                />
                {movementSearch && (
                  <button
                    onClick={() => setMovementSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">

                <select
                  value={movementGateFilter}
                  onChange={(e) => setMovementGateFilter(e.target.value)}
                  className="py-2 px-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">All Gates</option>
                  <option value="Main Gate">Main Gate</option>
                  <option value="Hostel Gate">Hostel Gate</option>
                </select>


                <select
                  value={movementStatusFilter}
                  onChange={(e) => setMovementStatusFilter(e.target.value)}
                  className="py-2 px-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="active">Active Outing</option>
                  <option value="completed">Returned / Completed</option>
                  <option value="overdue">Overdue</option>
                </select>

                <div className="px-3 py-2 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 rounded-xl text-xs font-bold whitespace-nowrap">
                  {filteredMovements.length} {filteredMovements.length === 1 ? "Record" : "Records"}
                </div>
              </div>
            </div>


            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm divide-y divide-gray-100 dark:divide-slate-800 min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Exit Time & Gate</th>
                    <th className="py-3.5 px-4">Entry Time & Gate</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 dark:text-slate-500">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-bold">No gate telemetry records found</p>
                        <p className="text-xs mt-0.5">Try changing your search term or gate filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">{m.student?.name || "Student"}</div>
                          <div className="font-mono text-gray-400 text-xs">{m.student?.roll_number}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium capitalize text-gray-700 dark:text-slate-300">
                          {m.movement_type ? m.movement_type.replace("_", " ") : "Day Outing"}
                          {m.purpose && (
                            <span className="block text-[11px] text-gray-400 normal-case">{m.purpose}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-slate-400 font-medium">
                          {formatIST(m.exit_time)} <span className="text-cyan-600 dark:text-cyan-400 font-bold">({formatGateName(m.exit_gate)})</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-slate-400 font-medium">
                          {m.entry_time ? (
                            <>
                              {formatIST(m.entry_time)} <span className="text-emerald-600 dark:text-emerald-400 font-bold">({formatGateName(m.entry_gate)})</span>
                            </>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">— In Progress</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const formatLateDuration = (minutes?: number) => {
                              if (!minutes || minutes <= 0) return "";
                              const hrs = Math.floor(minutes / 60);
                              const mins = minutes % 60;
                              if (hrs === 0) return `+${mins}m`;
                              if (mins === 0) return `+${hrs}h`;
                              return `+${hrs}h ${mins}m`;
                            };

                            const delayFormatted = formatLateDuration(m.curfew_delay_minutes);

                            if (!m.entry_time) {
                              return m.is_overdue ? (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-500/30 uppercase animate-pulse">
                                  🚨 Overdue {delayFormatted ? `(${delayFormatted})` : ""}
                                </span>
                              ) : m.movement_type === "hostel_leave" ? (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-500/30 uppercase">
                                  🏖️ On Leave
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-500/30 uppercase">
                                  🟢 Active Outing
                                </span>
                              );
                            }

                            return m.is_overdue ? (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-500/30 uppercase">
                                Late Return {delayFormatted ? `(${delayFormatted})` : ""}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                                Normal
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}



      {dossierStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setDossierStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Student Disciplinary Dossier
                </h3>
                <p className="text-xs text-gray-400">
                  {dossierStudent.name} • {dossierStudent.roll_number} • Rm {dossierStudent.room_number}
                </p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">

              <form onSubmit={handleAddDossierEntry} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">Action Category</label>
                  <CustomSelect
                    value={newActionType}
                    onChange={setNewActionType}
                    options={[
                      { value: "warning", label: "Formal Warning" },
                      { value: "parent_call", label: "Parent Phone Call Logged" },
                      { value: "counseling", label: "Warden Counseling Session" },
                      { value: "pardon", label: "Disciplinary Pardon" }
                    ]}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>


                <textarea
                  required
                  rows={2}
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="Record summary of parent conversation or counseling warning..."
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none dark:text-white"
                />

                <div className="flex justify-end">
                  <button type="submit" className="btn btn-sm btn-primary text-xs font-bold">
                    <Plus className="w-3.5 h-3.5" /> Save Entry
                  </button>
                </div>
              </form>


              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase text-gray-400">Recorded Incident Logs</h4>
                {dossierLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Clean disciplinary record. No violations logged.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800 space-y-2">
                    {dossierLogs.map((log) => (
                      <div key={log.id} className="pt-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold capitalize text-indigo-600 dark:text-indigo-400">
                            {log.action_type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatIST(log.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300">{log.remarks}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Recorded by: {log.warden_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {editingStudent && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Edit Student Directory Record
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Roll No: {editingStudent.roll_number}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-bold outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Student Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Hostel Room No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 926"
                    value={editForm.room_number}
                    onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono font-bold outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Academic Branch</label>
                  <CustomSelect
                    value={editForm.branch}
                    onChange={(val) => setEditForm({ ...editForm, branch: val })}
                    options={[
                      { value: "CSE", label: "Computer Science (CSE)" },
                      { value: "CSA", label: "Artificial Intelligence (CSA)" },
                      { value: "ECE", label: "Electronics & Comm (ECE)" },
                      { value: "HCI", label: "Human Computer Interaction (HCI)" }
                    ]}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Degree Year</label>
                  <CustomSelect
                    value={String(editForm.year)}
                    onChange={(val) => setEditForm({ ...editForm, year: Number(val) })}
                    options={[
                      { value: "1", label: "1st Year (BT26)" },
                      { value: "2", label: "2nd Year (BT25)" },
                      { value: "3", label: "3rd Year (BT24)" },
                      { value: "4", label: "4th Year (BT23)" }
                    ]}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.parent_name}
                    onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Parent Emergency Phone</label>
                  <input
                    type="tel"
                    required
                    value={editForm.parent_phone}
                    onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Current Movement Status</label>
                  <CustomSelect
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                    options={[
                      { value: "inside", label: "Inside Campus (Normal)" },
                      { value: "out_day", label: "Day Outing Pass" },
                      { value: "on_leave", label: "Vacation / Home Leave" },
                      { value: "suspended", label: "🚨 Suspended by Warden" }
                    ]}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Late Strikes Count (0-3)</label>
                  <CustomSelect
                    value={String(editForm.late_strike_count)}
                    onChange={(val) => setEditForm({ ...editForm, late_strike_count: Number(val) })}
                    options={[
                      { value: "0", label: "0 Strikes (Clean Record)" },
                      { value: "1", label: "1 Strike (Warning)" },
                      { value: "2", label: "2 Strikes (Final Warning)" },
                      { value: "3", label: "3 Strikes (Habitual Defaulter)" }
                    ]}
                    className="!py-2 !px-3 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 btn btn-secondary text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 btn btn-primary text-xs font-bold shadow-md"
                >
                  {editSubmitting ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-500" />
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Bulk Student Onboarding
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Upload a CSV file containing your 2,000+ resident students. Required columns:
              <br />
              <code className="text-[11px] font-mono text-sky-600 dark:text-sky-400 block mt-1 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg">
                roll_number, name, email, phone, hostel_block, room_number, branch, year, parent_name, parent_phone
              </code>
            </p>

            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-sky-500 transition-all cursor-pointer bg-gray-50/50 dark:bg-slate-800/30">
              <input
                type="file"
                accept=".csv"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                }}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                <Download className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {uploading ? "Processing CSV..." : "Click to select CSV File"}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">UTF-8 formatted .csv up to 10MB</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


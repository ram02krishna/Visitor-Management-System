import { useState, useEffect } from "react";
import { FileSpreadsheet, Download, AlertCircle, DownloadCloud } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/auth";
import { api } from "../lib/api";


type BulkUploadFormData = {
  file: FileList;
  approverEmail: string;
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function BulkVisitorUpload() {
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BulkUploadFormData>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.email && ["admin", "guard", "host"].includes(user.role || "")) {
      setValue("approverEmail", user.email);
    }
  }, [user?.email, user?.role, setValue]);

  const downloadSampleCsv = () => {
    const csvContent = `name,email,phone,purpose,visit_date,additional_guests,vehicle_number,vehicle_type,pass_type,valid_until
John Doe,john@example.com,+1234567890,Business Meeting,2024-03-15,2,MH-31-AB-1234,Car,single_day,
Jane Smith,jane@example.com,+1987654321,Interview,2024-03-16,0,,No Vehicle,multi_day,2024-03-20
Bob Wilson,bob@example.com,+1122334455,Maintenance,2024-03-17,1,KA-01-XY-5678,Bike,single_day,`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "visitor_upload_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCsv = async (file: File): Promise<{ [key: string]: string }[]> => {
    const Papa = (await import("papaparse")).default;
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as { [key: string]: string }[]),
        error: (error) => reject(error),
      });
    });
  };

  const onSubmit = async (formData: BulkUploadFormData) => {
    setUploading(true);
    try {
      if (!user || !["admin", "guard", "host"].includes(user.role || "")) {
        throw new Error("Only authorized users can bulk upload visitors.");
      }

      const file = formData.file[0];
      if (!file) throw new Error("Please select a file to upload.");
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit. Please use a smaller file.`);
      }

      if (!formData.approverEmail) throw new Error("Faculty/Staff email is required.");

      const hosts = await api.hosts.list(formData.approverEmail.trim());
      const approver = hosts.find(h => h.email.toLowerCase() === formData.approverEmail.trim().toLowerCase());

      if (!approver) {
        throw new Error(`No faculty/staff/admin found with email: ${formData.approverEmail}`);
      }

      const visitors = await processCsv(file);

      if (visitors.length === 0) {
        toast.error("The CSV file is empty or invalid.");
        setUploading(false);
        return;
      }

      let successCount = 0;

      for (const visitorData of visitors) {
        if (!visitorData.name || !visitorData.email) continue;

        try {
          const visitor = await api.visitors.upsert({
            name: visitorData.name,
            email: visitorData.email,
            phone: visitorData.phone || "N/A"
          });

          const rawPassType = (visitorData.pass_type || "").trim().toLowerCase();
          const passType: "single_day" | "multi_day" = rawPassType === "multi_day" ? "multi_day" : "single_day";
          const visitDate = visitorData.visit_date ? new Date(visitorData.visit_date) : new Date();
          let validUntil: Date;
          if (passType === "multi_day" && visitorData.valid_until) {
            validUntil = new Date(visitorData.valid_until);
          } else {
            validUntil = new Date(visitDate);
          }
          validUntil.setHours(23, 59, 59, 999);
          const additionalGuests = parseInt(visitorData.additional_guests, 10) || 0;

          await api.visits.create({
            visitor_id: visitor.id,
            host_id: approver.id,
            purpose: visitorData.purpose || "N/A",
            status: "pending",
            valid_until: validUntil.toISOString(),
            valid_from: visitDate.toISOString(),
            additional_guests: additionalGuests,
            vehicle_number: visitorData.vehicle_number?.trim() || null,
            vehicle_type: visitorData.vehicle_type?.trim() || null,
            pass_type: passType,
          });

          successCount++;
        } catch (err) {
          console.error(`Failed to upload visitor: ${visitorData.email}`, err);
        }
      }

      if (successCount === 0) {
        throw new Error("Failed to upload any visitors. Please check the CSV format.");
      }

      toast.success(`${successCount} Visitors successfully Uploaded! They will receive QR codes once approved.`);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to upload visitors.");
    } finally {
      setUploading(false);
    }
  };

  if (!user || !["admin", "guard", "host"].includes(user.role || "")) {
    return (
      <div className="space-y-6 pb-8 animate-fadeIn">
        <PageHeader
          backTo="/app/dashboard"
          icon={DownloadCloud}
          gradient="from-orange-500 to-amber-600"
          title="Bulk Visitor Import"
          description="Upload CSV spreadsheets to register multiple campus visitors simultaneously."
        />

        <div className="max-w-xl mx-auto text-center py-8">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl p-8">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-700 dark:text-red-300 mb-1">
              Access Denied
            </h2>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">
              Only authorized administrators, guards, and faculty can perform bulk visitor uploads.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <PageHeader
        backTo="/app/dashboard"
        icon={DownloadCloud}
        gradient="from-orange-500 to-amber-600"
        title="Bulk Visitor Import"
        description="Upload CSV spreadsheets to register multiple campus visitors simultaneously."
      />

      <div className="bg-white dark:bg-slate-900 shadow-xs rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-5">
          <div>
            <label
              htmlFor="approverEmail"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2"
            >
              Faculty/Staff Email (Admin/Guard/Faculty/Staff) *
            </label>
            <input
              type="email"
              id="approverEmail"
              {...register("approverEmail", { required: "Faculty/Staff email is required" })}
              disabled={user?.role === "host"}
              className="block w-full py-2.5 px-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white dark:bg-slate-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-slate-800/50 text-xs sm:text-sm outline-none transition-all"
              placeholder="staff@example.com"
            />
            {errors.approverEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.approverEmail.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="file"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2"
            >
              CSV File *
            </label>
            <input
              type="file"
              id="file"
              accept=".csv"
              {...register("file", { required: "Please select a CSV file" })}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:text-slate-400 dark:file:bg-sky-950/40 dark:file:text-sky-300 dark:hover:file:bg-sky-900/50 cursor-pointer"
            />
            {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file.message}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="btn-primary flex-1 !py-2.5 !rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" strokeWidth={2.5} />
                  <span>Upload Visitors</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="btn-secondary !py-2.5 !px-5 !rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-sky-500" />
              <span>Download Template</span>
            </button>
          </div>
        </form>
      </div>

      <div className="p-5 sm:p-6 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-900/30">
        <h3 className="font-bold text-sm text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          CSV File Format Guide
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-300 mb-3">
          Your CSV file must include these columns:
        </p>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 font-mono text-[11px] border border-amber-200/50 dark:border-slate-800 shadow-2xs">
          <div className="grid grid-cols-2 gap-y-2">
            <div>
              <span className="text-amber-600 dark:text-amber-400 font-bold">name</span> (required)
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-400 font-bold">email</span> (required)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">phone</span> (optional)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">purpose</span> (optional)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">visit_date</span> (YYYY-MM-DD)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">additional_guests</span> (number)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">vehicle_number</span> (e.g. MH-31-AB-1234)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">vehicle_type</span> (Car, Bike)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">pass_type</span> (single_day, multi_day)
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 font-medium">valid_until</span> (YYYY-MM-DD)
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-gray-500 dark:text-slate-400">
          All uploaded visitors will be saved with pending status and require administrator or faculty clearance before receiving QR codes.
        </p>
      </div>
    </div>
  );
}

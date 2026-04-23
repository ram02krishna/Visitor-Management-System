"use client";

import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, Download, AlertCircle, UploadCloud } from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";

import { v4 as uuidv4 } from "uuid";

type BulkUploadFormData = {
  file: FileList;
  approverEmail: string;
};

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
    const csvContent = `name,email,phone,purpose,visit_date
John Doe,john@example.com,+1234567890,Business Meeting,2024-03-15
Jane Smith,jane@example.com,+1987654321,Interview,2024-03-16`;

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
      if (!file) {
        throw new Error("Please select a file to upload.");
      }

      if (!formData.approverEmail) {
        throw new Error("Faculty/Staff email is required.");
      }

      const { data: approver, error: approverError } = await supabase
        .from("hosts")
        .select("id")
        .ilike("email", formData.approverEmail.trim())
        .maybeSingle();

      if (approverError || !approver) {
        throw new Error(`No faculty/staff/admin found with email: ${formData.approverEmail}`);
      }

      const visitors = await processCsv(file);

      if (visitors.length === 0) {
        toast.error("The CSV file is empty or invalid.");
        setUploading(false);
        return;
      }

      const newVisitorsData: { name: string; email: string; phone: string }[] = [];
      const existingVisitorEmails: string[] = [];

      visitors.forEach((visitor: { [key: string]: string }) => {
        if (visitor.email) {
          existingVisitorEmails.push(visitor.email);
        }
      });

      const { data: existingVisitors, error: existingVisitorsError } = await supabase
        .from("visitors")
        .select("id, email")
        .in("email", existingVisitorEmails);

      if (existingVisitorsError) throw existingVisitorsError;

      const existingVisitorsMap = new Map(existingVisitors?.map((v) => [v.email, v.id]));

      const visitsToInsert: {
        id: string;
        visitor_id: string | undefined;
        host_id: string;
        purpose: string;
        status: string;
        valid_until: string;
        created_at: string;
        updated_at: string;
      }[] = [];

      for (const visitorData of visitors) {
        const visitorId: string | undefined = existingVisitorsMap.get(visitorData.email);

        if (!visitorId) {
          newVisitorsData.push({
            name: visitorData.name,
            email: visitorData.email,
            phone: visitorData.phone || "N/A",
          });
        }

        const visitDate = visitorData.visit_date ? new Date(visitorData.visit_date) : new Date();
        visitDate.setHours(23, 59, 59, 999);

        visitsToInsert.push({
          id: uuidv4(),
          visitor_id: visitorId,
          host_id: approver.id,
          purpose: visitorData.purpose || "N/A",
          status: "pending",
          valid_until: visitDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (newVisitorsData.length > 0) {
        const { data: insertedVisitors, error: insertVisitorsError } = await supabase
          .from("visitors")
          .insert(newVisitorsData)
          .select("id, email");

        if (insertVisitorsError) throw insertVisitorsError;

        insertedVisitors?.forEach((v) => existingVisitorsMap.set(v.email, v.id));
      }

      visitsToInsert.forEach((visit, index) => {
        if (!visit.visitor_id) {
          const originalVisitorData = visitors[index];
          if (originalVisitorData) {
            visit.visitor_id = existingVisitorsMap.get(originalVisitorData.email);
          }
        }
      });

      const { error: visitsError } = await supabase.from("visits").insert(visitsToInsert);

      if (visitsError) {
        throw visitsError;
      }

      toast.success(
        `${visitors.length} Visitors successfully Uploaded! They will receive QR codes once approved.`
      );
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to upload visitors.");
    } finally {
      setUploading(false);
    }
  };

  if (!user || !["admin", "guard", "host"].includes(user.role || "")) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <BackButton />

        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600 dark:text-red-400">
              Only authorized users can perform bulk visitor uploads.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <BackButton />

        <PageHeader
          icon={UploadCloud}
          gradient="from-orange-500 to-amber-600"
          title="Bulk Upload"
          description="Upload multiple visitors at once using a CSV file. All visitors will be pending approval."
        />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
            <div>
              <label
                htmlFor="approverEmail"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
              >
                Faculty/Staff Email (Admin/Guard/Faculty/Staff) *
              </label>
              <input
                type="email"
                id="approverEmail"
                {...register("approverEmail", { required: "Faculty/Staff email is required" })}
                disabled={user?.role === "host"}
                className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-700"
                placeholder="staff@example.com"
              />
              {errors.approverEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.approverEmail.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
              >
                CSV File *
              </label>
              <input
                type="file"
                id="file"
                accept=".csv"
                {...register("file", { required: "Please select a CSV file" })}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:text-slate-400 dark:file:bg-orange-900/30 dark:file:text-orange-300 dark:hover:file:bg-orange-900/50 cursor-pointer"
              />
              {errors.file && <p className="mt-1 text-sm text-red-600">{errors.file.message}</p>}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" strokeWidth={2.5} />
                    Upload Visitors
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV File Format
          </h3>
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
            Your CSV file should have the following columns:
          </p>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 font-mono text-xs border border-orange-200 dark:border-orange-700">
            <div className="grid grid-cols-2 gap-y-2">
              <div>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">name</span>{" "}
                (required)
              </div>
              <div>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">email</span>{" "}
                (required)
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400 font-semibold">phone</span>{" "}
                (optional)
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400 font-semibold">purpose</span>{" "}
                (optional)
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400 font-semibold">visit_date</span>{" "}
                (optional, format: YYYY-MM-DD)
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600 dark:text-slate-400">
            All uploaded visitors will be in pending status and require approval before receiving QR
            codes.
          </p>
        </div>
      </div>
    </div>
  );
}

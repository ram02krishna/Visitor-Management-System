"use client";

import type React from "react";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { v4 as uuidv4 } from "uuid";
import { Camera, UserPlus, Calendar, Mail, Phone, Building2, FileText, User } from "lucide-react";

type PreRegisterFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  purpose: string;
  visitDate: string;
  hostEmail: string;
  photo?: FileList;
  notes?: string;
};

export function PreRegisterVisitor() {
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PreRegisterFormData>();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useState(() => {
    if ((user?.role === "guard" || user?.role === "admin") && user.email) {
      setValue("hostEmail", user.email);
    }
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData: PreRegisterFormData) => {
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      if (!user || (user.role !== "guard" && user.role !== "admin")) {
        throw new Error("Only guards and admins can pre-register visitors.");
      }

      const { data: approver, error: approverError } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.hostEmail)
        .in("role", ["guard", "admin"])
        .maybeSingle();

      if (approverError) {
        throw approverError;
      }

      if (!approver) {
        throw new Error(`No guard or admin found with email: ${formData.hostEmail}`);
      }

      // Create or find the visitor
      const { data: visitor, error: visitorError } = await supabase
        .from("visitors")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (visitorError) {
        throw visitorError;
      }

      let visitorId: string;

      if (!visitor) {
        const { data: newVisitor, error: newVisitorError } = await supabase
          .from("visitors")
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || "N/A",
            company: formData.company || "N/A",
          })
          .select("id")
          .single();

        if (newVisitorError) {
          throw newVisitorError;
        }
        visitorId = newVisitor.id;
      } else {
        visitorId = visitor.id;
      }

      // Upload photo if provided
      if (formData.photo && formData.photo.length > 0) {
        const file = formData.photo[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `visitor_photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("visitor-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
        }
      }

      const visitId = uuidv4();
      const visitDateTime = new Date(formData.visitDate);

      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: approver.id,
        purpose: formData.purpose,
        status: "pending",
        scheduled_time: visitDateTime.toISOString(),
        notes: formData.notes || null,
      });

      if (visitError) {
        throw visitError;
      }

      setSuccessMessage(
        "Visitor pre-registered successfully! They will receive a QR code once approved."
      );
      toast.success("Visitor pre-registered successfully!");
      reset();
      setPreviewPhoto(null);
    } catch (error: unknown) {
      const errorMsg = (error as Error).message || "Failed to pre-register visitor.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== "guard" && user.role !== "admin")) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600 dark:text-red-400">
              Only guards and administrators can pre-register visitors.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <UserPlus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pre-register Visitor
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 ml-14">
            Pre-register a visitor for approval. They'll receive a QR code once a guard or admin
            approves their visit.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8">
            {successMessage && (
              <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-400 mr-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-400 mr-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Visitor Information Section */}
              <div className="border-b border-gray-200 dark:border-slate-700 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  Visitor Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register("name", { required: "Visitor name is required" })}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="John Doe"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"
                    >
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...register("email", { required: "Email is required" })}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"
                    >
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      {...register("phone")}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"
                    >
                      <Building2 className="h-4 w-4" />
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      {...register("company")}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
              </div>

              {/* Visit Details Section */}
              <div className="border-b border-gray-200 dark:border-slate-700 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Visit Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="visitDate"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                    >
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      id="visitDate"
                      {...register("visitDate", { required: "Visit date is required" })}
                      min={new Date().toISOString().split("T")[0]}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                    />
                    {errors.visitDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.visitDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="hostEmail"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                    >
                      Approver Email (Guard/Admin) *
                    </label>
                    <input
                      type="email"
                      id="hostEmail"
                      {...register("hostEmail", { required: "Approver email is required" })}
                      disabled={user?.role === "guard" || user?.role === "admin"}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-700 transition-all"
                      placeholder="guard@example.com"
                    />
                    {errors.hostEmail && (
                      <p className="mt-1 text-sm text-red-600">{errors.hostEmail.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="purpose"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Purpose of Visit *
                    </label>
                    <input
                      type="text"
                      id="purpose"
                      {...register("purpose", { required: "Purpose is required" })}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Business meeting, Interview, Delivery..."
                    />
                    {errors.purpose && (
                      <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                    >
                      Additional Notes
                    </label>
                    <textarea
                      id="notes"
                      {...register("notes")}
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-800 dark:text-white transition-all"
                      placeholder="Any special instructions or requirements..."
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Visitor Photo (Optional)
                </label>
                <div className="mt-2 flex items-center gap-4">
                  {previewPhoto && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-purple-500">
                      <img
                        src={previewPhoto || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-lg hover:border-purple-500 transition-colors">
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-slate-400">
                          <span className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500">
                            Upload a photo
                          </span>
                          <span className="ml-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-500">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    </div>
                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      {...register("photo")}
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" strokeWidth={2.5} />
                    Pre-register Visitor
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setPreviewPhoto(null);
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
                className="px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Camera } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import emailjs from "@emailjs/browser";
import { supabase } from "../lib/supabase";
import { BackButton } from "./BackButton";

interface VisitorFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  purpose: string;
  entityEmail: string;
  visitDate: string;
  notes: string;
  photo?: FileList;
}

export default function RequestVisit() {
  const [formData, setFormData] = React.useState<VisitorFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    purpose: "",
    entityEmail: "",
    visitDate: "",
    notes: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "file" && (e.target as HTMLInputElement).files) {
      setFormData((prev) => ({ ...prev, photo: (e.target as HTMLInputElement).files! }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      let photoUrl = null;

      if (formData.photo?.[0]) {
        const file = formData.photo[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("identification-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("identification-images").getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      let entityId = null;
      let hostName = null;
      if (formData.entityEmail && formData.entityEmail.trim() !== "") {
        const { data: entityData, error: entityError } = await supabase
          .from("hosts")
          .select("id, name")
          .eq("email", formData.entityEmail)
          .in("role", ["host", "admin"])
          .maybeSingle();

        if (entityError && entityError.code !== "PGRST116") {
          throw new Error("Error looking up entity: " + entityError.message);
        }

        if (entityData) {
          entityId = entityData.id;
          hostName = entityData.name;
        }
      }

      let visitorId;
      const { data: existingVisitor, error: visitorLookupError } = await supabase
        .from("visitors")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (visitorLookupError && visitorLookupError.code !== "PGRST116") {
        throw visitorLookupError;
      }

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        const { error: updateError } = await supabase
          .from("visitors")
          .update({
            name: formData.name,
            phone: formData.phone,
            company: formData.company || null,
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", visitorId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data: newVisitor, error: createError } = await supabase
          .from("visitors")
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company || null,
            photo_url: photoUrl,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        visitorId = newVisitor.id;
      }

      const visitDate = new Date(formData.visitDate);
      visitDate.setHours(23, 59, 59, 999);

      const visitId = uuidv4();
      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: entityId,
        entity_id: entityId,
        purpose: formData.purpose,
        status: "pending",
        check_in_time: null,
        check_out_time: null,
        valid_until: visitDate.toISOString(),
        notes: formData.notes || null,
      });

      if (visitError) {
        throw visitError;
      }

      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (emailServiceId && adminTemplateId && emailPublicKey) {
        try {
          const { data: guardsAndAdmins, error: fetchError } = await supabase
            .from("hosts")
            .select("name, email")
            .in("role", ["guard", "admin"])
            .eq("active", true);

          if (fetchError) {
            console.error("Failed to fetch guards and admins:", fetchError);
          } else if (guardsAndAdmins && guardsAndAdmins.length > 0) {
            for (const recipient of guardsAndAdmins) {
              try {
                await emailjs.send(
                  emailServiceId,
                  adminTemplateId,
                  {
                    to_name: recipient.name,
                    to_email: recipient.email,
                    visitor_name: formData.name,
                    visit_purpose: formData.purpose,
                    visit_date: new Date(formData.visitDate).toLocaleDateString(),
                    host_name: hostName || "Not specified",
                    dashboard_link: window.location.origin + "/app/approval",
                  },
                  emailPublicKey
                );
              } catch (emailError) {
                console.error(`Failed to send email to ${recipient.email}:`, emailError);
              }
            }
          }
        } catch (err) {
          console.error("Error sending notification emails:", err);
        }
      }

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        purpose: "",
        entityEmail: "",
        visitDate: "",
        notes: "",
      });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to request visit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1 animate-fadeIn">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Request a Visit
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Please fill in the details for your visit request.
              </p>
            </div>
          </div>

          <div
            className="mt-5 md:mt-0 md:col-span-2 animate-fadeInUp"
            style={{ animationDelay: "0.1s" }}
          >
            <form onSubmit={handleSubmit}>
              <div className="shadow-xl sm:rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="px-4 py-5 glass space-y-6 sm:p-6">
                  {success && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4 mb-4 border border-green-200 dark:border-green-700 animate-fadeIn">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-green-400 dark:text-green-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Visit request submitted successfully! The host will review and approve
                            your visit. You will receive a QR code via email after approval.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 mb-4 border border-red-200 dark:border-red-700 animate-fadeIn">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400 dark:text-red-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            {error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Full name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Email address
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Phone number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        id="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="purpose"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Purpose of visit
                      </label>
                      <input
                        type="text"
                        name="purpose"
                        id="purpose"
                        required
                        value={formData.purpose}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6">
                      <label
                        htmlFor="entityEmail"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Host email (optional)
                      </label>
                      <input
                        type="email"
                        name="entityEmail"
                        id="entityEmail"
                        value={formData.entityEmail}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter the email of the host associated with this visit
                      </p>
                    </div>{" "}
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="visitDate"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Date of visit
                      </label>
                      <input
                        type="date"
                        name="visitDate"
                        id="visitDate"
                        required
                        value={formData.visitDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                    <div className="col-span-6">
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Notes (optional)
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleChange}
                        className="mt-1 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Visitor Photo (Optional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg dark:border-gray-600 hover:border-sky-400 dark:hover:border-sky-500 transition-all duration-300">
                      <div className="space-y-1 text-center">
                        <Camera className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label
                            htmlFor="photo"
                            className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-sky-600 hover:text-sky-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500 px-2"
                          >
                            <span>Upload a photo</span>
                            <input
                              id="photo"
                              name="photo"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF up to 10MB
                        </p>
                        {formData.photo && formData.photo.length > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                            Selected: {formData.photo[0].name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 text-right sm:px-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-3 px-6 border border-transparent shadow-lg text-sm font-medium rounded-lg text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                  >
                    {loading ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

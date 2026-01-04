import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Camera, UserCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";
import emailjs from "@emailjs/browser";
import { v4 as uuidv4 } from "uuid";
import log from "../lib/logger";

type VisitorFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  photo?: FileList;

  purpose: string;
  hostEmail: string;
  entityEmail: string; // Added field for entity email
  notes: string;
  status?: string;
};

export function VisitorRegistration() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VisitorFormData>();
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user session when component mounts
  useEffect(() => {
    async function getUserId() {
      log.info("[VisitorRegistration] Fetching user session...");
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        log.info("[VisitorRegistration] User session found:", data.session.user.id);
        setUserId(data.session.user.id);
      } else {
        log.warn("[VisitorRegistration] No user session found");
      }
    }
    getUserId();
  }, []);

  const onSubmit = async (formData: VisitorFormData) => {
    log.info("[VisitorRegistration] Form submission started");
    log.info("[VisitorRegistration] Form data:", {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      purpose: formData.purpose,
      hostEmail: formData.hostEmail,
      hostEmailEmpty: !formData.hostEmail || formData.hostEmail.trim() === "",
      entityEmail: formData.entityEmail,
      hasPhoto: formData.photo ? formData.photo.length > 0 : false,
    });

    try {
      // Check if user is authenticated
      if (!userId) {
        log.error("[VisitorRegistration] User not authenticated");
        toast.error("You must be logged in to register visitors");
        return;
      }

      log.info("[VisitorRegistration] User authenticated:", userId);

      let photoUrl = null;

      // Upload photo if provided
      if (formData.photo?.[0]) {
        log.info("[VisitorRegistration] Uploading visitor photo...");
        const file = formData.photo[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`; // Using UUID for unique filenames
        const filePath = fileName; // Remove "visitor-photos/" prefix

        // Make sure we're using the correct bucket name and have proper permissions
        const { error: uploadError } = await supabase.storage
          .from("identification-images") // Make sure this bucket exists
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          log.error("[VisitorRegistration] Photo upload error:", uploadError);
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        log.info("[VisitorRegistration] Photo uploaded successfully");

        const {
          data: { publicUrl },
        } = supabase.storage.from("identification-images").getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Get host details if email is provided
      let hostId = null;
      if (formData.hostEmail && formData.hostEmail.trim() !== "") {
        log.info("[VisitorRegistration] Looking up host with email:", formData.hostEmail);
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("id")
          .eq("email", formData.hostEmail)
          .maybeSingle();

        if (hostError && hostError.code !== "PGRST116") {
          log.error("[VisitorRegistration] Host lookup error:", hostError);
          throw new Error("Error looking up host: " + hostError.message);
        }

        if (hostData) {
          hostId = hostData.id;
          log.info("[VisitorRegistration] Host found:", hostId);
        } else {
          log.warn("[VisitorRegistration] No host found with email:", formData.hostEmail);
          toast.error(
            "No host found with the provided email. Please make sure the host exists in the system."
          );
          throw new Error("No host found with email: " + formData.hostEmail);
        }
      }

      // Look up entity by email in the hosts table, if provided
      let entityId = null;
      if (formData.entityEmail && formData.entityEmail.trim() !== "") {
        log.info("[VisitorRegistration] Looking up entity with email:", formData.entityEmail);
        const { data: entityData, error: entityError } = await supabase
          .from("hosts")
          .select("id")
          .eq("email", formData.entityEmail)
          .eq("role", "host") // Make sure we're getting an entity role
          .maybeSingle();

        if (entityError && entityError.code !== "PGRST116") {
          log.error("[VisitorRegistration] Entity lookup error:", entityError);
          throw new Error("Error looking up entity: " + entityError.message);
        }

        if (entityData) {
          entityId = entityData.id;
          log.info("[VisitorRegistration] Entity found:", entityId);
        } else {
          log.warn("[VisitorRegistration] No entity found with email:", formData.entityEmail);
          toast.error(
            "No entity found with the provided email. Please make sure the entity exists in the system."
          );
          throw new Error("No entity found with email: " + formData.entityEmail);
        }
      }

      // Step 1: Create or find existing visitor
      let visitorId;

      log.info("[VisitorRegistration] Checking for existing visitor with email:", formData.email);
      const { data: existingVisitor, error: visitorLookupError } = await supabase
        .from("visitors")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (visitorLookupError && visitorLookupError.code !== "PGRST116") {
        log.error("[VisitorRegistration] Visitor lookup error:", visitorLookupError);
        throw visitorLookupError;
      }

      if (existingVisitor) {
        log.info("[VisitorRegistration] Existing visitor found:", existingVisitor.id);
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
          log.error("[VisitorRegistration] Visitor update error:", updateError);
          throw updateError;
        }
        log.info("[VisitorRegistration] Visitor updated successfully");
      } else {
        log.info("[VisitorRegistration] Creating new visitor...");
        const { data: newVisitor, error: createError } = await supabase
          .from("visitors")
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company || null,
            photo_url: photoUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          log.error("[VisitorRegistration] Visitor creation error:", createError);
          throw createError;
        }

        visitorId = newVisitor.id;
        log.info("[VisitorRegistration] New visitor created:", visitorId);
      }

      // Step 2: Create visit record
      const currentTime = new Date().toISOString();
      const visitId = uuidv4(); // Generate unique visit ID

      log.info("[VisitorRegistration] Creating visit record with ID:", visitId);

      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: hostId, // Can be null if no host email provided
        entity_id: entityId, // Now using the correctly looked-up entity ID
        purpose: formData.purpose,
        status: "pending",
        notes: formData.notes || null,
        created_at: currentTime,
        updated_at: currentTime,
      });

      if (visitError) {
        log.error("[VisitorRegistration] Visit creation error:", visitError);
        throw visitError;
      }

      log.info("[VisitorRegistration] Visit record created successfully");

      // Step 3: Generate QR code with visit info
      log.info("[VisitorRegistration] Generating QR code...");
      const qrData = JSON.stringify({
        visitId,
      });

      const qrUrl = await QRCode.toDataURL(qrData);
      setQrImageUrl(qrUrl);
      log.info("[VisitorRegistration] QR code generated successfully");

      // Step 4: Send Email using EmailJS
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!emailServiceId || !emailTemplateId || !emailPublicKey) {
        log.warn(
          "[VisitorRegistration] EmailJS credentials not configured. Skipping email notification."
        );
      } else {
        try {
          log.info("[VisitorRegistration] Sending email to:", formData.email);
          const emailParams = {
            to_name: formData.name,
            to_email: formData.email,
            email: formData.email, // Some templates use 'email' instead of 'to_email'
            name: formData.name, // Some templates use 'name' instead of 'to_name'
            qr_code: qrUrl,
            visit_id: visitId,
            visit_purpose: formData.purpose,
            purpose: formData.purpose, // Alternative naming
            host_email: formData.hostEmail || "N/A",
            host_name: formData.hostEmail || "N/A",
            entity_email: formData.entityEmail || "N/A",
          };

          log.info("[VisitorRegistration] Email parameters:", emailParams);

          const emailResult = await emailjs.send(
            emailServiceId,
            emailTemplateId,
            emailParams,
            emailPublicKey
          );

          log.info("[VisitorRegistration] Email send result:", emailResult);
          if (emailResult.status !== 200) {
            log.warn("[VisitorRegistration] Email sending failed with status:", emailResult.status);
          } else {
            log.info("[VisitorRegistration] Email sent successfully");
          }
        } catch (emailError) {
          log.error("[VisitorRegistration] Failed to send email:", emailError);
          // Continue execution even if email fails
        }
      }

      log.info("[VisitorRegistration] Registration completed successfully");
      toast.success("Visitor registered successfully!");
      reset();
    } catch (error: unknown) {
      log.error("[VisitorRegistration] Registration error:", error);
      toast.error(`Failed: ${(error as Error).message || "Unknown error"}`);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <UserCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Register New Visitor
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Please fill in the visitor's details and take their photo for security purposes.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="shadow sm:rounded-md sm:overflow-hidden">
            <div className="px-4 py-5 bg-white dark:bg-slate-900 space-y-6 sm:p-6">
              {/* Visitor Information Section */}
              <div>
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Visitor Information
                </h4>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Full name
                    </label>
                    <input
                      type="text"
                      {...register("name", { required: "Name is required" })}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                      })}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Phone number
                    </label>
                    <input
                      type="tel"
                      {...register("phone", {
                        required: "Phone number is required",
                      })}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Company
                    </label>
                    <input
                      type="text"
                      {...register("company")}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visitor Photo
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-slate-600">
                    <div className="space-y-1 text-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 dark:text-slate-400">
                        <label
                          htmlFor="photo"
                          className="relative cursor-pointer bg-white dark:bg-slate-900 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>Upload a photo</span>
                          <input
                            id="photo"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            {...register("photo")}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Information Section */}
              <div>
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Visit Information
                </h4>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label
                      htmlFor="purpose"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Purpose of visit
                    </label>
                    <input
                      type="text"
                      {...register("purpose", {
                        required: "Purpose is required",
                      })}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    {errors.purpose && (
                      <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
                    )}
                  </div>

                  <div className="col-span-6">
                    <label
                      htmlFor="hostEmail"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Host email
                    </label>
                    <input
                      type="email"
                      {...register("hostEmail")}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Enter the email of the host associated with this visit (optional)
                    </p>
                  </div>

                  <div className="col-span-6">
                    <label
                      htmlFor="entityEmail"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Entity email
                    </label>
                    <input
                      type="email"
                      {...register("entityEmail")}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Enter the email of the entity associated with this visit (optional)
                    </p>
                  </div>

                  <div className="col-span-6">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 dark:text-slate-300"
                    >
                      Notes (optional)
                    </label>
                    <textarea
                      {...register("notes")}
                      rows={3}
                      className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="text-center">
                {qrImageUrl && (
                  <div className="mt-6">
                    <h5 className="text-md font-medium text-gray-700 dark:text-gray-300">
                      Visitor's QR Code
                    </h5>
                    <img src={qrImageUrl} alt="QR Code" className="mx-auto mt-3" />
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 text-right sm:px-6">
              {!userId && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                  You must be logged in to register visitors
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !userId}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <UserCheck className="h-4 w-4" strokeWidth={2.5} />
                {isSubmitting ? "Registering..." : "Register Visitor"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

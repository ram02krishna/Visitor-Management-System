import type { Database } from "./database.types";
import { dataSync, SyncTopic } from "./dataSync";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 15000;

function invalidateMatchingCaches(path: string) {
  const cleanPath = path.split("?")[0];
  for (const key of cache.keys()) {
    if (key.includes(cleanPath) || cleanPath.includes("/visits") || cleanPath.includes("/visitors")) {
      cache.delete(key);
    }
  }

  let topic: SyncTopic = "all";
  if (cleanPath.startsWith("/visitors")) {
    topic = "visitors";
    api.uiCache.delete("vms_blacklisted");
  } else if (cleanPath.startsWith("/visits")) {
    topic = "visits";
    api.uiCache.delete("vms_all_logs");
    api.uiCache.delete("vms_dash_recent");
    api.uiCache.delete("vms_dash_active");
    for (const key of api.uiCache.keys()) {
      if (key.startsWith("vms_filtered_")) {
        api.uiCache.delete(key);
      }
    }
    dataSync.notify("stats");
  } else if (cleanPath.startsWith("/hosts")) {
    topic = "hosts";
    api.uiCache.delete("vms_users");
  } else if (cleanPath.startsWith("/students")) {
    topic = "students";
    api.uiCache.delete("vms_hostel_census");
    api.uiCache.delete("vms_hostel_overdue");
    api.uiCache.delete("vms_hostel_directory");
    api.uiCache.delete("vms_floor_census");
  } else if (cleanPath.startsWith("/lost-and-found")) {
    topic = "lostAndFound";
    api.uiCache.delete("vms_lost_found");
  } else if (cleanPath.startsWith("/vehicles")) {
    topic = "vehicles";
    api.uiCache.delete("vms_vehicles");
  }

  dataSync.notify(topic);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || "GET";
  const cacheKey = `${method}:${path}`;

  if (method === "GET") {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
  }

  const token = localStorage.getItem("vms_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  headers.set("Content-Type", "application/json");

  const fetchPromise = fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  })
    .then(async (res) => {
      if (!res.ok) {
        if (res.status === 401 && !path.includes("/auth/")) {
          localStorage.removeItem("vms_token");
          localStorage.removeItem("vms_user_profile");
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
            window.location.href = "/login";
          }
        }
        let errorMessage = "API Error";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || res.statusText;
        } catch {
          errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      
      if (method === "GET") {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      } else {
        invalidateMatchingCaches(path);
      }
      
      return data as T;
    })
    .finally(() => {
      if (method === "GET") {
        inFlightRequests.delete(cacheKey);
      }
    });

  if (method === "GET") {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const api = {
  getCachedData: <T>(path: string): T | null => {
    const cacheKey = `GET:${path}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
    return null;
  },

  invalidateAllCaches: () => {
    cache.clear();
    api.uiCache.clear();
    dataSync.notify("all");
  },
  uiCache: new Map<string, any>(),


  departments: {
    list: (): Promise<Pick<Row<"departments">, "id" | "name">[]> => apiFetch("/departments"),
  },

  upload: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("vms_token");
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    
    return fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },

  hosts: {
    list: (search?: string): Promise<Row<"hosts">[]> => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch(`/hosts${qs}`);
    },

    get: (id: string): Promise<Row<"hosts">> => apiFetch(`/hosts/${id}`),

    create: (data: {
      name: string;
      email: string;
      role?: string;
      active?: boolean;
      department_id?: string;
    }): Promise<Row<"hosts">> => apiFetch("/hosts", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<Pick<Row<"hosts">, "role" | "active" | "name" | "department_id">>
    ): Promise<Row<"hosts">> =>
      apiFetch(`/hosts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/hosts/${id}`, { method: "DELETE" }),
  },

  visitors: {
    list: (params?: {
      search?: string;
      blacklisted?: boolean;
      email?: string;
    }): Promise<Row<"visitors">[]> => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.blacklisted) qs.set("blacklisted", "true");
      if (params?.email) qs.set("email", params.email);
      const q = qs.toString();
      return apiFetch(`/visitors${q ? `?${q}` : ""}`);
    },

    getIdsByEmail: async (email: string): Promise<string[]> => {
      const visitors = await apiFetch<Row<"visitors">[]>(
        `/visitors?email=${encodeURIComponent(email)}`
      );
      return visitors.map((v) => v.id);
    },

    upsert: (data: {
      name: string;
      email: string;
      phone: string;
      photo_url?: string | null;
      id_proof_url?: string | null;
    }): Promise<Row<"visitors">> =>
      apiFetch("/visitors", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<Pick<Row<"visitors">, "is_blacklisted" | "blacklist_reason">>
    ): Promise<Row<"visitors">> =>
      apiFetch(`/visitors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  visits: {
    list: (params?: {
      status?: string;
      statuses?: string[];
      search?: string;
      date?: string;
      limit?: number;
      offset?: number;
      host_id?: string;
      approved_from?: string;
      approved_to?: string;
      checkout_from?: string;
      checkout_to?: string;
      created_from?: string;
      created_to?: string;
      _t?: number;
    }): Promise<
      (Row<"visits"> & {
        visitor: Row<"visitors"> | null;
        host: Pick<Row<"hosts">, "id" | "name" | "email" | "department_id"> | null;
      })[]
    > => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.statuses?.length) qs.set("statuses", params.statuses.join(","));
      if (params?.search) qs.set("search", params.search);
      if (params?.date) qs.set("date", params.date);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      if (params?.host_id) qs.set("host_id", params.host_id);
      if (params?.approved_from) qs.set("approved_from", params.approved_from);
      if (params?.approved_to) qs.set("approved_to", params.approved_to);
      if (params?.checkout_from) qs.set("checkout_from", params.checkout_from);
      if (params?.checkout_to) qs.set("checkout_to", params.checkout_to);
      if (params?.created_from) qs.set("created_from", params.created_from);
      if (params?.created_to) qs.set("created_to", params.created_to);
      if (params?._t) qs.set("_t", String(params._t));
      const q = qs.toString();
      return apiFetch(`/visits${q ? `?${q}` : ""}`);
    },

    get: (
      id: string
    ): Promise<
      Row<"visits"> & {
        visitor: Row<"visitors"> | null;
        host: Pick<Row<"hosts">, "id" | "name" | "email" | "department_id"> | null;
      }
    > => apiFetch(`/visits/${id}`),

    create: (data: {
      id?: string;
      visitor_id: string;
      host_id?: string | null;
      purpose: string;
      status?: string;
      approved_at?: string;
      approved_by?: string | null;
      valid_until?: string;
      valid_from?: string;
      expected_out_time?: string;
      vehicle_number?: string | null;
      vehicle_type?: string | null;
      additional_guests?: number;
      pass_type?: string;
    }): Promise<Row<"visits">> =>
      apiFetch("/visits", { method: "POST", body: JSON.stringify(data) }),


    update: (
      id: string,
      data: Partial<{
        status: string;
        approved_at: string | null;
        approved_by: string | null;
        check_in_time: string | null;
        check_out_time: string | null;
        exit_gate: string | null;
        entry_gate: string | null;
        is_vip?: boolean;
        vip_category?: string | null;
        vip_parking_slot?: string | null;
        overstay_notified?: boolean;
        escort_name?: string | null;
        updated_at: string;
      }>
    ): Promise<Row<"visits">> =>
      apiFetch(`/visits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    getTrafficTelemetry: () =>
      apiFetch<{
        census: {
          currentCampusPopulation: number;
          campusSafeCapacity: number;
          occupancyPercentage: number;
          insideStudents: number;
          outStudents: number;
          leaveStudents: number;
          activeVisitorsCount: number;
          overstayCount: number;
        };
        overstayedVisits: Array<{
          id: string;
          visitorName?: string;
          visitorPhone?: string;
          purpose: string;
          checkInTime: string;
          hostName: string;
          overstayMinutes: number;
          escortName?: string;
          overstayNotified: boolean;
        }>;
        hourlyDistribution: Array<{ hour: string; entries: number; exits: number }>;
      }>("/visits/analytics/traffic-telemetry"),

    selfServiceKiosk: (data: {
      name: string;
      email?: string;
      phone: string;
      company?: string;
      purpose: string;
      category?: string;
      vehicle_number?: string;
      photo_url?: string;
      host_name?: string;
    }) =>
      apiFetch<{
        visit: any;
        qrPayload: string;
        message: string;
      }>("/visits/self-service-kiosk", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    dispatchEscort: (id: string, escort_name?: string) =>
      apiFetch<{ visit: any; message: string }>(`/visits/${id}/escort`, {
        method: "PATCH",
        body: JSON.stringify({ escort_name }),
      }),

  },

  analytics: {
    get: (params?: { date_range?: number; department_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.date_range) qs.set("date_range", String(params.date_range));
      if (params?.department_id) qs.set("department_id", params.department_id);
      const q = qs.toString();
      return apiFetch<{
        total_visits: number;
        total_visitors: number;
        avg_visit_duration: string;
        approval_rate: number;
        denial_rate: number;
        today_visits: number;
        week_visits: number;
        month_visits: number;
        top_purposes: { purpose: string; count: number }[];
        daily_stats: { date: string; count: number }[];
      }>(`/analytics${q ? `?${q}` : ""}`);
    },
  },

  students: {
    scanPass: (data: { scanData: string; gate?: string }): Promise<{
      success: boolean;
      action: "exit" | "entry";
      movement_type: string;
      message: string;
      expected_in?: string;
      is_overdue?: boolean;
      curfew_delay_minutes?: number;
      strikes?: number;
      is_flagged?: boolean;
      has_extension?: boolean;
      student: {
        id: string;
        roll_number: string;
        name: string;
        email: string;
        phone: string;
        hostel_block: string;
        room_number: string;
        branch: string;
        year: number;
        parent_name: string;
        parent_phone: string;
        photo_url?: string | null;
        status: string;
        late_strike_count?: number;
        is_flagged?: boolean;
      };

      movement?: {
        id: string;
        movement_type: string;
        exit_time: string;
        entry_time?: string | null;
        exit_gate?: string | null;
        entry_gate?: string | null;
        expected_in: string;
        is_overdue: boolean;
      };
    }> => apiFetch("/students/scan-pass", { method: "POST", body: JSON.stringify(data) }),

    getCensus: (): Promise<{
      total: number;
      inside: number;
      out_day: number;
      on_leave: number;
      overdue: number;
      blocks: { hostel_block: string; status: string; _count: { _all: number } }[];
    }> => apiFetch("/students/census"),

    getOverdue: (): Promise<Array<{
      id: string;
      movement_type: string;
      exit_time: string;
      expected_in: string;
      exit_gate?: string | null;
      student: {
        id: string;
        roll_number: string;
        name: string;
        phone: string;
        hostel_block: string;
        room_number: string;
        parent_name: string;
        parent_phone: string;
        photo_url?: string | null;
      };
    }>> => apiFetch("/students/overdue"),

    list: (params?: {
      search?: string;
      status?: string;
      hostel_block?: string;
      limit?: number;
      offset?: number;
    }): Promise<{
      students: Array<{
        id: string;
        roll_number: string;
        name: string;
        email: string;
        phone: string;
        hostel_block: string;
        room_number: string;
        branch: string;
        year: number;
        parent_name: string;
        parent_phone: string;
        photo_url?: string | null;
        status: string;
        created_at: string;
      }>;
      total: number;
    }> => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.status) qs.set("status", params.status);
      if (params?.hostel_block) qs.set("hostel_block", params.hostel_block);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      return apiFetch(`/students${q ? `?${q}` : ""}`);
    },

    updateStudent: (id: string, data: {
      name?: string;
      email?: string;
      phone?: string;
      hostel_block?: string;
      room_number?: string;
      branch?: string;
      year?: number;
      parent_name?: string;
      parent_phone?: string;
      status?: string;
      late_strike_count?: number;
      is_flagged?: boolean;
    }) =>
      apiFetch<{ success: boolean; message: string; student: any }>(`/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),

    bulkUpload: (students: Array<{

      roll_number: string;
      name: string;
      email: string;
      phone?: string;
      hostel_block?: string;
      room_number?: string;
      branch?: string;
      year?: number;
      parent_name?: string;
      parent_phone?: string;
      photo_url?: string;
    }>): Promise<{ success: boolean; message: string; inserted: number; updated: number }> =>
      apiFetch("/students/bulk", { method: "POST", body: JSON.stringify({ students }) }),

    claimPass: (roll_number: string) =>
      apiFetch<{
        success: boolean;
        message: string;
        token: string;
        user: any;
        student: any;
      }>("/auth/claim-student", {
        method: "POST",
        body: JSON.stringify({ roll_number }),
      }),


    createLeave: (data: {
      student_id?: string;
      roll_number?: string;
      leave_type: string;
      from_date: string;
      to_date: string;
      destination: string;
      reason: string;
    }) => apiFetch("/students/leave", { method: "POST", body: JSON.stringify(data) }),

    listLeaves: (params?: { status?: string; student_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.student_id) qs.set("student_id", params.student_id);
      const q = qs.toString();
      return apiFetch<Array<{
        id: string;
        student_id: string;
        leave_type: string;
        from_date: string;
        to_date: string;
        destination: string;
        reason: string;
        status: string;
        approved_by?: string | null;
        approved_at?: string | null;
        created_at: string;
        student: {
          id: string;
          roll_number: string;
          name: string;
          hostel_block: string;
          room_number: string;
          photo_url?: string | null;
          phone: string;
        };
      }>>(`/students/leaves${q ? `?${q}` : ""}`);
    },

    updateLeave: (id: string, status: "approved" | "rejected") =>
      apiFetch(`/students/leave/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

    updateParentConsent: (id: string, parent_consent: "pending" | "verified" | "exempted", parent_remarks?: string) =>
      apiFetch(`/students/leave/${id}/parent-consent`, {
        method: "PATCH",
        body: JSON.stringify({ parent_consent, parent_remarks })
      }),

    getFloorCensus: () =>
      apiFetch<{
        hostel: string;
        totalResidents: number;
        totalInside: number;
        totalOut: number;
        totalLeave: number;
        floors: Array<{
          floor: number;
          label: string;
          description: string;
          total: number;
          inside: number;
          out_day: number;
          on_leave: number;
          flagged: number;
          occupancyRate: number;
          students: Array<{
            id: string;
            name: string;
            roll_number: string;
            room_number: string;
            branch: string;
            year: number;
            phone: string;
            parent_phone: string;
            status: string;
            late_strike_count: number;
            is_flagged: boolean;
          }>;
        }>;
      }>("/students/floor-census"),

    resetStrikes: (id: string) =>
      apiFetch(`/students/${id}/reset-strikes`, { method: "POST" }),

    getExportCensusUrl: () => {
      const token = localStorage.getItem("vms_token");
      return token ? `${API_BASE}/api/students/export-census?token=${encodeURIComponent(token)}` : `${API_BASE}/api/students/export-census`;
    },

    exportCensusCsv: async () => {
      const token = localStorage.getItem("vms_token");
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const res = await fetch(`${API_BASE}/api/students/export-census`, {
        headers,
      });
      if (!res.ok) {
        let err = "Failed to export night census CSV";
        try {
          const j = await res.json();
          if (j.error) err = j.error;
        } catch {}
        throw new Error(err);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Hostel_Night_Census_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },

    listMovements: (params?: { student_id?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.student_id) qs.set("student_id", params.student_id);
      if (params?.limit) qs.set("limit", String(params.limit));
      const q = qs.toString();
      return apiFetch<Array<{
        id: string;
        student_id: string;
        movement_type: string;
        exit_time: string;
        entry_time?: string | null;
        exit_gate?: string | null;
        entry_gate?: string | null;
        expected_in: string;
        curfew_delay_minutes?: number;
        is_overdue: boolean;
        student: {
          name: string;
          roll_number: string;
          hostel_block: string;
          room_number: string;
          photo_url?: string | null;
        };
      }>>(`/students/movements${q ? `?${q}` : ""}`);
    },

    requestCurfewExtension: (data: { roll_number?: string; additional_minutes?: number; reason: string }) =>
      apiFetch<{ success: boolean; message: string; extension: any }>("/students/curfew-extension", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    listCurfewExtensions: (params?: { status?: string; student_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.student_id) qs.set("student_id", params.student_id);
      const q = qs.toString();
      return apiFetch<any[]>(`/students/curfew-extensions${q ? `?${q}` : ""}`);
    },

    updateCurfewExtension: (id: string, status: "approved" | "rejected") =>
      apiFetch<{ success: boolean; message: string; extension: any }>(`/students/curfew-extensions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),

    addDisciplinaryLog: (studentId: string, data: { action_type: string; remarks: string }) =>
      apiFetch<{ success: boolean; message: string; log: any }>(`/students/${studentId}/disciplinary-log`, {
        method: "POST",
        body: JSON.stringify(data)
      }),

    listDisciplinaryLogs: (studentId: string) =>
      apiFetch<any[]>(`/students/${studentId}/disciplinary-logs`),
  },

  emergency: {
    getActive: () => apiFetch<any>("/emergency/active"),

    broadcastAlert: (data: { title: string; message: string; severity?: string }) =>
      apiFetch<{ success: boolean; message: string; alert: any }>("/emergency/alert", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    resolveAlert: () =>
      apiFetch<{ success: boolean; message: string }>("/emergency/resolve", { method: "POST" }),

    checkin: (data: { alert_id: string; status?: string; location?: string; notes?: string; roll_number?: string; name?: string }) =>
      apiFetch<{ success: boolean; message: string; checkin: any }>("/emergency/checkin", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    getCensus: (alertId: string) =>
      apiFetch<{ totalStudents: number; safeCount: number; needHelpCount: number; pendingCount: number; checkins: any[] }>(
        `/emergency/census/${alertId}`
      ),
  },

  vehicles: {
    register: (data: {
      owner_type?: string;
      owner_name?: string;
      roll_number?: string;
      vehicle_type: string;
      license_plate: string;
      vehicle_model?: string;
      parking_slot?: string;
    }) =>
      apiFetch<{ success: boolean; message: string; vehiclePass: any }>("/vehicles", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    list: (params?: { search?: string; owner_type?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.owner_type) qs.set("owner_type", params.owner_type);
      if (params?.status) qs.set("status", params.status);
      const q = qs.toString();
      return apiFetch<any[]>(`/vehicles${q ? `?${q}` : ""}`);
    },

    lookup: (plate: string) =>
      apiFetch<{ success: boolean; pass: any }>(`/vehicles/lookup/${encodeURIComponent(plate)}`),

    revoke: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/vehicles/${id}`, { method: "DELETE" }),
  },

  lostAndFound: {
    list: (params?: { search?: string; category?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.category) qs.set("category", params.category);
      if (params?.status) qs.set("status", params.status);
      const q = qs.toString();
      return apiFetch<{
        items: Array<{
          id: string;
          title: string;
          category: string;
          description?: string;
          location_found: string;
          photo_url?: string;
          found_by_name: string;
          found_by_role: string;
          found_by_contact?: string;
          status: string;
          claimed_by_name?: string;
          claimed_by_id?: string;
          claimed_by_phone?: string;
          claimed_at?: string;
          handover_officer?: string;
          created_at: string;
        }>;
        stats: {
          total: number;
          inCustody: number;
          claimed: number;
        };
      }>(`/lost-and-found${q ? `?${q}` : ""}`);
    },

    create: (data: {
      title: string;
      category: string;
      description?: string;
      location_found: string;
      photo_url?: string;
      found_by_name: string;
      found_by_role?: string;
      found_by_contact?: string;
    }) =>
      apiFetch<{ item: any; message: string }>("/lost-and-found", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    claim: (
      id: string,
      data: {
        claimed_by_name: string;
        claimed_by_id: string;
        claimed_by_phone?: string;
        handover_officer?: string;
      }
    ) =>
      apiFetch<{ item: any; message: string }>(`/lost-and-found/${id}/claim`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/lost-and-found/${id}`, {
        method: "DELETE",
      }),
  },
};





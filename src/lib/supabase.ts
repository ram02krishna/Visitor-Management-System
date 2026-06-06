import { createClient } from "@supabase/supabase-js";
import log from "./logger";

// ✅ Ensure environment variables exist
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  log.error("❌ Supabase environment variables are missing.");
  throw new Error(
    "⚠️ Missing Supabase URL or ANON KEY. Check your .env file and restart the server."
  );
}

// ✅ Create Supabase client
// Use localStorage so sessions persist across tabs and survive page refreshes
// without needing extra getSession() round trips.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? localStorage : undefined,
  },
  realtime: {
    // Keep the WebSocket alive with a periodic heartbeat.
    // Prevents costly reconnect + re-subscribe on every navigation.
    params: {
      heartbeat_interval_ms: 30000, // 30 s keepalive
    },
  },
});

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    log.info("[Supabase] Auth state changed:", event);
    if (session?.user) {
      log.info("[Supabase] User session active:", session.user.id);
    }
    if (event === "SIGNED_OUT") {
      log.info("[Supabase] User signed out");
      // Clear the in-memory visitor ID cache on logout
      import("./visitorIds").then(({ clearVisitorIdCache }) => clearVisitorIdCache());
    }
  });
}

if (import.meta.env.DEV) {
  log.info("[Supabase] Environment check:");
  log.info("[Supabase] - URL:", supabaseUrl ? "✓ Loaded" : "✗ Missing");
  log.info("[Supabase] - Anon Key:", supabaseAnonKey ? "✓ Loaded" : "✗ Missing");
}

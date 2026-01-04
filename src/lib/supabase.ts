import { createClient } from "@supabase/supabase-js";
import log from "./logger";

// ✅ Ensure environment variables exist
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  log.error("❌ Supabase environment variables are missing.");
  throw new Error("⚠️ Missing Supabase URL or ANON KEY. Check your .env file and restart the server.");
}

// ✅ Create Supabase client with proper auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
});

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    log.info('[Supabase] Auth state changed:', event);
    if (session?.user) {
      log.info('[Supabase] User session active:', session.user.id);
    }
    // Auth state change handler - can be used for logging or analytics
    if (event === 'SIGNED_OUT') {
      log.info('[Supabase] User signed out, clearing cached data');
      // Clear any cached data on sign out
      localStorage.removeItem('supabase.auth.token');
    }
  });
}

// Verify environment variables are loaded
if (import.meta.env.DEV) {
  log.info('[Supabase] Environment check:');
  log.info('[Supabase] - URL:', supabaseUrl ? '✓ Loaded' : '✗ Missing');
  log.info('[Supabase] - Anon Key:', supabaseAnonKey ? '✓ Loaded' : '✗ Missing');
}

// Connection test in development mode only
if (import.meta.env.DEV) {
  (async () => {
    try {
      log.info('[Supabase] Testing database connection...');
      const { error } = await supabase.from('visits').select('*', { count: 'exact', head: true });
      if (error) {
        log.error('[Supabase] ✗ Connection test failed:', error.message);
        log.error('[Supabase] Error details:', error);
      } else {
        log.info('[Supabase] ✓ Connection test successful');
      }
    } catch (err) {
      log.error('[Supabase] ✗ Initialization error:', err);
    }
  })();
}

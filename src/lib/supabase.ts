import { createClient } from "@supabase/supabase-js";

// ✅ Ensure environment variables exist
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables are missing.");
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
    console.log('[Supabase] Auth state changed:', event);
    if (session?.user) {
      console.log('[Supabase] User session active:', session.user.id);
    }
    // Auth state change handler - can be used for logging or analytics
    if (event === 'SIGNED_OUT') {
      console.log('[Supabase] User signed out, clearing cached data');
      // Clear any cached data on sign out
      localStorage.removeItem('supabase.auth.token');
    }
  });
}

// Verify environment variables are loaded
if (import.meta.env.DEV) {
  console.log('[Supabase] Environment check:');
  console.log('[Supabase] - URL:', supabaseUrl ? '✓ Loaded' : '✗ Missing');
  console.log('[Supabase] - Anon Key:', supabaseAnonKey ? '✓ Loaded' : '✗ Missing');
}

// Connection test in development mode only
if (import.meta.env.DEV) {
  (async () => {
    try {
      console.log('[Supabase] Testing database connection...');
      const { error } = await supabase.from('visits').select('*', { count: 'exact', head: true });
      if (error) {
        console.error('[Supabase] ✗ Connection test failed:', error.message);
        console.error('[Supabase] Error details:', error);
      } else {
        console.log('[Supabase] ✓ Connection test successful');
      }
    } catch (err) {
      console.error('[Supabase] ✗ Initialization error:', err);
    }
  })();
}

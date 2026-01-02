import { create } from "zustand";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../lib/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

export interface User {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, departmentId: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  //  Initialize authentication
  initialize: async () => {
    console.log('[Auth] Initializing authentication...');
    try {
      console.log('[Auth] Fetching session from Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Auth] Session fetch error:', error.message);
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        console.log('[Auth] Session found for user:', session.user.id);
        console.log('[Auth] Fetching host data from database...');
        
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();

        if (hostError && hostError.code !== 'PGRST116') {
          console.error('[Auth] Host data fetch error:', hostError);
          throw hostError;
        }

        if (hostData) {
          console.log('[Auth] Host data retrieved:', { 
            id: hostData.id, 
            name: hostData.name, 
            role: hostData.role,
            email: hostData.email 
          });

          if (hostData.role === "visitor") {
            console.warn('[Auth] Visitor role blocked');
            throw new Error("Visitor role is no longer supported");
          }

          console.log('[Auth] Authentication successful');
          set({
            user: hostData as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          console.log('[Auth] No host data found for session user.');
          set({ isAuthenticated: false, isLoading: false, user: null });
        }
      } else {
        console.log('[Auth] No active session found');
        set({ isAuthenticated: false, isLoading: false, user: null });
      }
    } catch (err: unknown) {
      console.error('[Auth] Authentication initialization failed:', (err as Error).message);
      console.error('[Auth] Error details:', err);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: (err as Error).message || "Failed to initialize auth",
      });
    }
  },

  //  Login function
  login: async (email: string, password: string) => {
    console.log('[Auth] Login attempt for email:', email);
    try {
      set({ isLoading: true, error: null });

      console.log('[Auth] Signing in with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('[Auth] Sign-in error:', error.message);
        throw error;
      }

      if (data?.user) {
        console.log('[Auth] Sign-in successful, user ID:', data.user.id);
        console.log('[Auth] Fetching host data...');
        
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", data.user.id)
          .single();

        if (hostError) {
          console.error('[Auth] Host data fetch error:', hostError);
          throw hostError;
        }

        console.log('[Auth] Host data retrieved:', {
          id: hostData.id,
          name: hostData.name,
          role: hostData.role,
          email: hostData.email
        });

        //  Block visitor role
        if (hostData.role === "visitor") {
          console.warn('[Auth] Login blocked: visitor role');
          throw new Error("Visitor role is no longer supported");
        }

        console.log('[Auth] Login successful');
        set({
          user: hostData as User,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      console.error('[Auth] Login failed:', (error as Error).message);
      console.error('[Auth] Error details:', error);
      set({
        error: (error as Error).message || "Invalid credentials",
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  },

  // Signup function
  signup: async (email: string, password: string, name: string, departmentId: string) => {
    console.log('[Auth] Signup attempt:', { email, name, departmentId });
    try {
      set({ isLoading: true, error: null });

      console.log('[Auth] Creating auth user in Supabase...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            department_id: departmentId,
          },
        },
      });

      if (signUpError) {
        console.error('[Auth] Sign-up error:', signUpError.message);
        throw signUpError;
      }

      if (!authData.user) {
        console.error('[Auth] No user data returned from sign-up');
        throw new Error("Failed to create user account");
      }

      console.log('[Auth] Auth user created:', authData.user.id);
      
      // Host record will be created by a database trigger.
      // Now, simply set loading to false and clear error.
      console.log('[Auth] Signup successful; host record handled by trigger.');
      set({ isLoading: false, error: null });
    } catch (error: unknown) {
      console.error('[Auth] Signup failed:', (error as Error).message);
      console.error('[Auth] Error details:', error);
      set({
        error: (error as Error).message || "Failed to create account",
        isLoading: false,
      });
      throw error;
    }
  },

  // Logout function
  logout: async () => {
    console.log('[Auth] Logout initiated');
    try {
      set({ isLoading: true, error: null });
      console.log('[Auth] Signing out from Supabase...');
      await supabase.auth.signOut();
      console.log('[Auth] Logout successful');
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (error: unknown) {
      console.error('[Auth] Logout failed:', (error as Error).message);
      console.error('[Auth] Error details:', error);
      set({ error: "Failed to logout", isLoading: false });
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    console.log('[Auth] Initiating Google Sign-In...');
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        console.error('[Auth] Google Sign-In error:', error.message);
        throw error;
      }
    } catch (error: unknown) {
      console.error('[Auth] Google Sign-In failed:', (error as Error).message);
      set({
        error: (error as Error).message || 'Google Sign-In failed',
        isLoading: false,
      });
    }
  },
}));

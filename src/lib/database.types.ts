export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Visit = {
  id: string;
  visitor_name: string;
  purpose: string;
  host_name: string;
  check_in: string | null;
  check_out: string | null;
  status: 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled';
};

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      hosts: {
        Row: {
          id: string
          auth_id: string
          name: string
          email: string
          department_id: string
          role: 'admin' | 'guard' | 'host'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          name: string
          email: string
          department_id: string
          role?: 'admin' | 'guard' | 'host'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          name?: string
          email?: string
          department_id?: string
          role?: 'admin' | 'guard' | 'host'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      visitors: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          company: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          company?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          company?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          visitor_id: string
          host_id: string
          purpose: string
          status: 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled'
          check_in_time: string | null
          check_out_time: string | null
          valid_until: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visitor_id: string
          host_id: string
          purpose: string
          status?: 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled'
          check_in_time?: string | null
          check_out_time?: string | null
          valid_until: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visitor_id?: string
          host_id?: string
          purpose?: string
          status?: 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled'
          check_in_time?: string | null
          check_out_time?: string | null
          valid_until?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'guard' | 'host'
      visit_status: 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled'
    }
  }
}

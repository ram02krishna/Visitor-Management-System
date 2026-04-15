export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Visit = {
  id: string;
  visitor_id: string;
  host_id: string;
  purpose: string;
  status: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
  visitor: {
    name: string;
  };
};

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      hosts: {
        Row: {
          id: string;
          auth_id: string;
          name: string;
          email: string;
          department_id: string;
          role: "admin" | "guard" | "host" | "visitor";
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          name: string;
          email: string;
          department_id: string;
          role?: "admin" | "guard" | "host" | "visitor";
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          name?: string;
          email?: string;
          department_id?: string;
          role?: "admin" | "guard" | "host" | "visitor";
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      visitors: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          photo_url: string | null;
          id_proof_url: string | null;
          is_blacklisted: boolean;
          blacklist_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          photo_url?: string | null;
          id_proof_url?: string | null;
          is_blacklisted?: boolean;
          blacklist_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          photo_url?: string | null;
          id_proof_url?: string | null;
          is_blacklisted?: boolean;
          blacklist_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      visits: {
        Row: {
          id: string;
          visitor_id: string;
          host_id: string;
          purpose: string;
          status: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
          check_in_time: string | null;
          check_out_time: string | null;
          valid_until: string | null;
          notes: string | null;
          vehicle_number: string | null;
          vehicle_type: string | null;
          entry_gate: string | null;
          exit_gate: string | null;
          expected_out_time: string | null;
          additional_guests: number;
          pass_type: "single_day" | "multi_day";
          valid_from: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          visitor_id: string;
          host_id: string;
          purpose: string;
          status?: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
          check_in_time?: string | null;
          check_out_time?: string | null;
          valid_until?: string | null;
          notes?: string | null;
          vehicle_number?: string | null;
          vehicle_type?: string | null;
          entry_gate?: string | null;
          exit_gate?: string | null;
          expected_out_time?: string | null;
          additional_guests?: number;
          pass_type?: "single_day" | "multi_day";
          valid_from?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          visitor_id?: string;
          host_id?: string;
          purpose?: string;
          status?: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
          check_in_time?: string | null;
          check_out_time?: string | null;
          valid_until?: string | null;
          notes?: string | null;
          vehicle_number?: string | null;
          vehicle_type?: string | null;
          entry_gate?: string | null;
          exit_gate?: string | null;
          expected_out_time?: string | null;
          additional_guests?: number;
          pass_type?: "single_day" | "multi_day";
          valid_from?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "admin" | "guard" | "host" | "visitor";
      visit_status: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
      pass_type: "single_day" | "multi_day";
    };
  };
};

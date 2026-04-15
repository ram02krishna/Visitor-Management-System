-- IIIT NAGPUR VMS - FULL DATABASE SCHEMA

-- SET DEFAULT TIMEZONE TO IST (Indian Standard Time)
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';
SET timezone TO 'Asia/Kolkata';

-- ENUM HANDLING (Clean & Strict)
DO $$ 
BEGIN
    -- 1. Create user_role ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'guard', 'host', 'visitor');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'host') THEN
            ALTER TYPE user_role ADD VALUE 'host';
        END IF;
    END IF;

    -- 2. Create visit_status ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
        CREATE TYPE visit_status AS ENUM ('pending', 'approved', 'denied', 'completed', 'cancelled', 'checked-in');
    END IF;

    -- 3. Create pass_type ENUM
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pass_type') THEN
        CREATE TYPE pass_type AS ENUM ('single_day', 'multi_day');
    END IF;
END $$;

-- TABLES (Order: Departments first since others depend on it)

CREATE TABLE IF NOT EXISTS departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id uuid UNIQUE,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    department_id uuid,
    role user_role NOT NULL DEFAULT 'visitor'::user_role,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Data Migration: Force 'host' role for any old faculty_staff records (Safe check)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hosts' AND table_schema = 'public') THEN
        UPDATE public.hosts SET role = 'host' WHERE role::text = 'faculty_staff';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS visitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    photo_url text,
    id_proof_url text,
    is_blacklisted boolean DEFAULT false,
    blacklist_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitors_email_phone ON visitors(email, phone);

CREATE TABLE IF NOT EXISTS visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id uuid NOT NULL,
    host_id uuid,
    purpose text NOT NULL,
    status visit_status DEFAULT 'pending',
    approved_at timestamptz,
    approved_by uuid,
    check_in_time timestamptz,
    check_out_time timestamptz,
    scheduled_time timestamptz DEFAULT now(),
    valid_from timestamptz DEFAULT now(),
    valid_until timestamptz,
    expected_out_time timestamptz,
    notes text,
    vehicle_number text,
    vehicle_type text,
    entry_gate text,
    exit_gate text,
    additional_guests integer DEFAULT 0,
    pass_type pass_type DEFAULT 'single_day'::pass_type,
    entity_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT check_checkout_after_checkin CHECK (
        check_out_time IS NULL OR 
        check_in_time IS NULL OR 
        check_out_time > check_in_time
    )
);

-- FOREIGN KEY CONSTRAINTS
ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_auth_id_fkey;
ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_department_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_visitor_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_host_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_approved_by_fkey;

ALTER TABLE hosts ADD CONSTRAINT hosts_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE hosts ADD CONSTRAINT hosts_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE visits ADD CONSTRAINT visits_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE;
ALTER TABLE visits ADD CONSTRAINT visits_host_id_fkey FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE RESTRICT;
ALTER TABLE visits ADD CONSTRAINT visits_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES hosts(id) ON DELETE SET NULL;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role::text = 'admin' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_guard(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role::text = 'guard' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_host(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role::text = 'host' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- TIMEZONE CONVERSION HELPERS
CREATE OR REPLACE FUNCTION to_ist_string(ts timestamptz) RETURNS text AS $$
    SELECT to_char(ts AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY HH12:MI AM');
$$ LANGUAGE sql IMMUTABLE;

-- POLICIES

-- Departments
DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "departments_admin_all" ON departments;
CREATE POLICY "departments_admin_all" ON departments FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Hosts
DROP POLICY IF EXISTS "hosts_insert_self" ON hosts;
CREATE POLICY "hosts_insert_self" ON hosts FOR INSERT WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "hosts_select_own_or_privileged" ON hosts;
CREATE POLICY "hosts_select_own_or_privileged" ON hosts FOR SELECT USING (auth.uid() = auth_id OR is_admin(auth.uid()) OR is_guard(auth.uid()));

DROP POLICY IF EXISTS "hosts_update_admin_only" ON hosts;
CREATE POLICY "hosts_update_admin_only" ON hosts FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Visitors
DROP POLICY IF EXISTS "visitors_insert_public" ON visitors;
CREATE POLICY "visitors_insert_public" ON visitors FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "visitors_select_authenticated" ON visitors;
CREATE POLICY "visitors_select_authenticated" ON visitors FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "visitors_select_public_recent" ON visitors;
CREATE POLICY "visitors_select_public_recent" ON visitors FOR SELECT USING (auth.role() = 'anon' AND created_at > (now() - interval '10 minutes'));

-- Visits
DROP POLICY IF EXISTS "visits_insert_public_validated" ON visits;
CREATE POLICY "visits_insert_public_validated" ON visits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "visits_select_own_or_privileged" ON visits;
CREATE POLICY "visits_select_own_or_privileged" ON visits FOR SELECT USING (
    EXISTS (SELECT 1 FROM hosts WHERE hosts.id = visits.host_id AND hosts.auth_id = auth.uid()) OR is_admin(auth.uid()) OR is_guard(auth.uid())
);

DROP POLICY IF EXISTS "visits_update_role_based" ON visits;
CREATE POLICY "visits_update_role_based" ON visits FOR UPDATE USING (
    is_admin(auth.uid()) OR is_guard(auth.uid()) OR EXISTS (SELECT 1 FROM hosts WHERE hosts.id = visits.host_id AND hosts.auth_id = auth.uid())
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_host_id ON visits(host_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_hosts_email ON hosts(email);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC FUNCTIONS
CREATE OR REPLACE FUNCTION get_analytics(
    p_date_range INTEGER DEFAULT 7,
    p_department_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_visits', (SELECT count(*) FROM visits WHERE (p_department_id IS NULL OR host_id IN (SELECT id FROM hosts WHERE department_id = p_department_id))),
        'total_visitors', (SELECT count(DISTINCT visitor_id) FROM visits),
        'avg_visit_duration', '2.5 Hours',
        'approval_rate', 85,
        'denial_rate', 5,
        'today_visits', (SELECT count(*) FROM visits WHERE created_at > now() - interval '1 day'),
        'week_visits', (SELECT count(*) FROM visits WHERE created_at > now() - interval '7 days'),
        'month_visits', (SELECT count(*) FROM visits WHERE created_at > now() - interval '30 days'),
        'top_purposes', (
            SELECT json_agg(t) FROM (
                SELECT purpose, count(*) as count 
                FROM visits 
                GROUP BY purpose 
                ORDER BY count DESC 
                LIMIT 5
            ) t
        ),
        'daily_stats', (
            SELECT json_agg(d) FROM (
                SELECT to_char(date_trunc('day', created_at), 'DD Mon') as date, count(*) as count
                FROM visits
                WHERE created_at > now() - (p_date_range || ' days')::interval
                GROUP BY 1
                ORDER BY date_trunc('day', MIN(created_at))
            ) d
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- DEFAULT DATA
INSERT INTO departments (name) VALUES
    ('Administration'), ('Faculty'), ('Security'), ('IT Department'), ('Facilities'), ('Hostel'), ('Library')
ON CONFLICT (name) DO NOTHING;


-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.create_public_profile_on_signup()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.hosts (auth_id, name, email, role, active)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, 'visitor'::user_role, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_public_profile_on_signup();

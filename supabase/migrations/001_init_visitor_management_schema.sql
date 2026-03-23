-- =====================================================
-- SECURE VISITOR MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Fixed Version with IST Timezone Support
-- =====================================================

-- =====================================================
-- SET DEFAULT TIMEZONE TO IST (Indian Standard Time)
-- =====================================================
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';
-- Note: You may need to run this for your specific database name
-- ALTER DATABASE your_database_name SET timezone TO 'Asia/Kolkata';

-- Set timezone for current session
SET timezone TO 'Asia/Kolkata';

-- ENUM Creation (duplicate safe)
DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('pending', 'approved', 'denied', 'completed', 'cancelled', 'checked-in');
EXCEPTION WHEN duplicate_object THEN
    ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'checked-in';
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'guard', 'host');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

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
    role user_role NOT NULL DEFAULT 'host',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    company text,
    photo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add separate index for lookups instead of unique constraint
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
    valid_until timestamptz,  -- This is OPTIONAL - can be NULL
    notes text,
    entity_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT check_checkout_after_checkin CHECK (
        check_out_time IS NULL OR 
        check_in_time IS NULL OR 
        check_out_time > check_in_time
    )
);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_auth_id_fkey;
ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_department_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_visitor_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_host_id_fkey;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_approved_by_fkey;

ALTER TABLE hosts 
    ADD CONSTRAINT hosts_auth_id_fkey 
    FOREIGN KEY (auth_id) REFERENCES auth.users(id) 
    ON DELETE CASCADE;

ALTER TABLE hosts 
    ADD CONSTRAINT hosts_department_id_fkey 
    FOREIGN KEY (department_id) REFERENCES departments(id) 
    ON DELETE SET NULL;

ALTER TABLE visits 
    ADD CONSTRAINT visits_visitor_id_fkey 
    FOREIGN KEY (visitor_id) REFERENCES visitors(id) 
    ON DELETE CASCADE;

ALTER TABLE visits 
    ADD CONSTRAINT visits_host_id_fkey 
    FOREIGN KEY (host_id) REFERENCES hosts(id) 
    ON DELETE RESTRICT;

ALTER TABLE visits 
    ADD CONSTRAINT visits_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES hosts(id) 
    ON DELETE SET NULL;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP ALL EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Departments readable" ON departments;
DROP POLICY IF EXISTS "departments_select_all" ON departments;
DROP POLICY IF EXISTS "departments_select_public" ON departments;
DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
DROP POLICY IF EXISTS "departments_admin_all" ON departments;
DROP POLICY IF EXISTS "Users can insert themselves as hosts" ON hosts;
DROP POLICY IF EXISTS "Users can view only their own host record" ON hosts;
DROP POLICY IF EXISTS "Hosts read access for self, admin, and guard" ON hosts;
DROP POLICY IF EXISTS "Admins have full access on hosts" ON hosts;
DROP POLICY IF EXISTS "Guards can view all host records" ON hosts;
DROP POLICY IF EXISTS "hosts_insert_self" ON hosts;
DROP POLICY IF EXISTS "hosts_select_own_or_privileged" ON hosts;
DROP POLICY IF EXISTS "hosts_update_admin_only" ON hosts;
DROP POLICY IF EXISTS "hosts_delete_admin_only" ON hosts;
DROP POLICY IF EXISTS "Visitors insert allowed" ON visitors;
DROP POLICY IF EXISTS "Visitors read allowed" ON visitors;
DROP POLICY IF EXISTS "Visitors update by guard/admin" ON visitors;
DROP POLICY IF EXISTS "visitors_insert_authenticated" ON visitors;
DROP POLICY IF EXISTS "visitors_insert_public" ON visitors;
DROP POLICY IF EXISTS "visitors_select_authenticated" ON visitors;
DROP POLICY IF EXISTS "visitors_select_public" ON visitors;
DROP POLICY IF EXISTS "visitors_update_privileged" ON visitors;
DROP POLICY IF EXISTS "visitors_update_public" ON visitors;
DROP POLICY IF EXISTS "visitors_update_public_or_privileged" ON visitors;
DROP POLICY IF EXISTS "visitors_delete_admin_only" ON visitors;
DROP POLICY IF EXISTS "visitors_update_own_recent" ON visitors;
DROP POLICY IF EXISTS "visitors_insert_authenticated_privileged" ON visitors;
DROP POLICY IF EXISTS "Visits insert allowed" ON visits;
DROP POLICY IF EXISTS "Visits read allowed" ON visits;
DROP POLICY IF EXISTS "Hosts can see their own visits" ON visits;
DROP POLICY IF EXISTS "Admins and guards can see all visits" ON visits;
DROP POLICY IF EXISTS "Visits update by guard/admin/host" ON visits;
DROP POLICY IF EXISTS "visits_insert_authenticated" ON visits;
DROP POLICY IF EXISTS "visits_insert_public" ON visits;
DROP POLICY IF EXISTS "visits_insert_public_validated" ON visits;
DROP POLICY IF EXISTS "visits_select_own_or_privileged" ON visits;
DROP POLICY IF EXISTS "visits_update_host_or_privileged" ON visits;
DROP POLICY IF EXISTS "visits_update_role_based" ON visits;
DROP POLICY IF EXISTS "visits_delete_admin_only" ON visits;
DROP POLICY IF EXISTS "visitors_select_public_recent" ON visitors;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_guard(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_host(uuid) CASCADE;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role = 'admin' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_guard(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role = 'guard' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_host(user_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM hosts 
        WHERE auth_id = user_id 
        AND role = 'host' 
        AND active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- TIMEZONE CONVERSION HELPER FUNCTIONS
-- =====================================================

-- Function to convert timestamp to IST formatted string
CREATE OR REPLACE FUNCTION to_ist_string(ts timestamptz)
RETURNS text AS $$
    SELECT to_char(ts AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY HH12:MI AM');
$$ LANGUAGE sql IMMUTABLE;

-- Function to convert timestamp to IST date only
CREATE OR REPLACE FUNCTION to_ist_date(ts timestamptz)
RETURNS text AS $$
    SELECT to_char(ts AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY');
$$ LANGUAGE sql IMMUTABLE;

-- Function to convert timestamp to IST time only
CREATE OR REPLACE FUNCTION to_ist_time(ts timestamptz)
RETURNS text AS $$
    SELECT to_char(ts AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
$$ LANGUAGE sql IMMUTABLE;

-- =====================================================
-- DEPARTMENTS POLICIES
-- =====================================================

-- Authenticated users can view departments
CREATE POLICY "departments_select_authenticated"
    ON departments FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Admins have full control
CREATE POLICY "departments_admin_all"
    ON departments FOR ALL
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- HOSTS POLICIES
-- =====================================================

-- Users can insert themselves as hosts (via trigger)
CREATE POLICY "hosts_insert_self"
    ON hosts FOR INSERT
    WITH CHECK (auth.uid() = auth_id);

-- Users can view their own record, admins/guards can view all
CREATE POLICY "hosts_select_own_or_privileged"
    ON hosts FOR SELECT
    USING (
        auth.uid() = auth_id OR
        is_admin(auth.uid()) OR
        is_guard(auth.uid())
    );

-- Only admins can update host records
CREATE POLICY "hosts_update_admin_only"
    ON hosts FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete hosts
CREATE POLICY "hosts_delete_admin_only"
    ON hosts FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- VISITORS POLICIES
-- =====================================================

-- Allow public/anon to insert visitors (for pre-registration)
CREATE POLICY "visitors_insert_public"
    ON visitors FOR INSERT
    WITH CHECK (
        (auth.role() = 'anon' OR auth.role() = 'authenticated') AND
        name IS NOT NULL AND
        email IS NOT NULL AND
        phone IS NOT NULL
    );

-- Authenticated users can view all visitors
CREATE POLICY "visitors_select_authenticated"
    ON visitors FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow anon to read visitors they just created (for confirmation)
CREATE POLICY "visitors_select_public_recent"
    ON visitors FOR SELECT
    USING (
        auth.role() = 'anon' AND
        created_at > (now() - interval '5 minutes')
    );

-- Only admin/guard can update visitor records
CREATE POLICY "visitors_update_privileged"
    ON visitors FOR UPDATE
    USING (
        is_admin(auth.uid()) OR 
        is_guard(auth.uid())
    )
    WITH CHECK (
        is_admin(auth.uid()) OR 
        is_guard(auth.uid())
    );

-- Only admins can delete visitors
CREATE POLICY "visitors_delete_admin_only"
    ON visitors FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- VISITS POLICIES
-- =====================================================

-- Allow public/anon to insert pending visits with validation
-- Note: valid_until is OPTIONAL and can be NULL
CREATE POLICY "visits_insert_public_validated"
    ON visits FOR INSERT
    WITH CHECK (
        (auth.role() = 'anon' OR auth.role() = 'authenticated') AND
        status = 'pending' AND
        visitor_id IS NOT NULL AND
        -- Validate host exists and is active if host_id is provided
        (host_id IS NULL OR EXISTS (
            SELECT 1 FROM hosts 
            WHERE id = visits.host_id 
            AND active = true
        ))
    );

-- Users can view visits based on their role
CREATE POLICY "visits_select_own_or_privileged"
    ON visits FOR SELECT
    USING (
        -- Host can see their own visits
        EXISTS (
            SELECT 1 FROM hosts 
            WHERE hosts.id = visits.host_id 
            AND hosts.auth_id = auth.uid()
        ) OR
        -- Admin/guard can see all visits
        is_admin(auth.uid()) OR
        is_guard(auth.uid())
    );

-- Improved update policy with clearer role-based permissions
CREATE POLICY "visits_update_role_based"
    ON visits FOR UPDATE
    USING (
        -- Admin and guard can update any visit
        is_admin(auth.uid()) OR
        is_guard(auth.uid()) OR
        -- Host can update their own visits
        EXISTS (
            SELECT 1 FROM hosts 
            WHERE hosts.id = visits.host_id 
            AND hosts.auth_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Admin and guard can set any status
        (is_admin(auth.uid()) OR is_guard(auth.uid())) OR
        -- Hosts can only approve, deny, or cancel
        (
            EXISTS (
                SELECT 1 FROM hosts 
                WHERE hosts.id = visits.host_id 
                AND hosts.auth_id = auth.uid()
            ) AND
            status IN ('approved', 'denied', 'cancelled')
        )
    );

-- Only admins can delete visits
CREATE POLICY "visits_delete_admin_only"
    ON visits FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_host_id ON visits(host_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_entity_id ON visits(entity_id);
CREATE INDEX IF NOT EXISTS idx_visits_check_in_time ON visits(check_in_time);
CREATE INDEX IF NOT EXISTS idx_visits_valid_until ON visits(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hosts_email ON hosts(email);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone);
CREATE INDEX IF NOT EXISTS idx_hosts_auth_id ON hosts(auth_id);
CREATE INDEX IF NOT EXISTS idx_hosts_role ON hosts(role);
CREATE INDEX IF NOT EXISTS idx_hosts_active ON hosts(active);
CREATE INDEX IF NOT EXISTS idx_hosts_department_id ON hosts(department_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_visits_status_created 
    ON visits(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_host_status 
    ON visits(host_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_date_range 
    ON visits(created_at, status) 
    WHERE status IN ('pending', 'approved');

-- =====================================================
-- UPDATED_AT AUTOMATION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_hosts_updated_at ON hosts;
DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at
    BEFORE UPDATE ON hosts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at
    BEFORE UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-APPROVAL TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION set_approved_timestamp()
RETURNS TRIGGER AS $$
DECLARE
    approving_host_id uuid;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        NEW.approved_at = now();
        
        IF auth.uid() IS NOT NULL THEN
            -- Get the host_id corresponding to the authenticated user
            SELECT id INTO approving_host_id
            FROM hosts
            WHERE auth_id = auth.uid();
            
            IF approving_host_id IS NOT NULL THEN
                NEW.approved_by = approving_host_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_visits_approved_timestamp ON visits;

CREATE TRIGGER set_visits_approved_timestamp
    BEFORE UPDATE ON visits
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION set_approved_timestamp();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

INSERT INTO departments (name) VALUES
    ('Administration'),
    ('Faculty'),
    ('Security'),
    ('IT Department'),
    ('Facilities'),
    ('Human Resources'),
    ('Finance')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_visits(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS get_visits(TEXT, TEXT, visit_status, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS get_visits() CASCADE;
DROP FUNCTION IF EXISTS get_visitor_stats(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_visitor_stats() CASCADE;
DROP FUNCTION IF EXISTS get_my_pending_visits() CASCADE;
DROP FUNCTION IF EXISTS export_visits(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_analytics(INT, UUID, visit_status) CASCADE;

-- =====================================================
-- 1. GET VISITS (with search, filter, pagination)
-- All timestamps returned in IST
-- =====================================================

CREATE FUNCTION get_visits(
    p_search_term TEXT DEFAULT NULL,
    p_date_filter TEXT DEFAULT NULL,
    p_status_filter visit_status DEFAULT NULL,
    p_page_number INT DEFAULT 1,
    p_page_size INT DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    visitor_id uuid,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_company TEXT,
    purpose TEXT,
    host_id uuid,
    host_name TEXT,
    host_email TEXT,
    department_name TEXT,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status visit_status,
    valid_until TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_is_admin boolean;
    user_is_guard boolean;
    user_host_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    user_is_admin := is_admin(current_user_id);
    user_is_guard := is_guard(current_user_id);
    
    SELECT h.id INTO user_host_id
    FROM hosts h
    WHERE h.auth_id = current_user_id;
    
    RETURN QUERY
    WITH filtered_visits AS (
        SELECT
            v.id,
            v.visitor_id,
            vi.name AS visitor_name,
            vi.email AS visitor_email,
            vi.phone AS visitor_phone,
            vi.company AS visitor_company,
            v.purpose,
            v.host_id,
            h.name AS host_name,
            h.email AS host_email,
            d.name AS department_name,
            v.check_in_time AS check_in,
            v.check_out_time AS check_out,
            v.status,
            v.valid_until,
            v.approved_at,
            v.notes,
            v.created_at,
            COUNT(*) OVER() AS total_count
        FROM visits v
        LEFT JOIN visitors vi ON v.visitor_id = vi.id
        LEFT JOIN hosts h ON v.host_id = h.id
        LEFT JOIN departments d ON h.department_id = d.id
        WHERE
            (user_is_admin OR user_is_guard OR v.host_id = user_host_id)
            AND (
                p_search_term IS NULL OR p_search_term = '' OR
                vi.name ILIKE ('%' || p_search_term || '%') OR
                h.name ILIKE ('%' || p_search_term || '%') OR
                vi.email ILIKE ('%' || p_search_term || '%') OR
                vi.company ILIKE ('%' || p_search_term || '%')
            )
            AND (
                p_date_filter IS NULL OR p_date_filter = '' OR
                (v.check_in_time AT TIME ZONE 'Asia/Kolkata')::date = to_date(p_date_filter, 'YYYY-MM-DD') OR
                (v.created_at AT TIME ZONE 'Asia/Kolkata')::date = to_date(p_date_filter, 'YYYY-MM-DD')
            )
            AND (p_status_filter IS NULL OR v.status = p_status_filter)
    )
    SELECT *
    FROM filtered_visits
    ORDER BY
        CASE WHEN check_in IS NOT NULL THEN check_in ELSE created_at END DESC
    LIMIT p_page_size
    OFFSET (p_page_number - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. GET VISITOR STATISTICS
-- =====================================================

CREATE FUNCTION get_visitor_stats(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_visits BIGINT,
    pending_visits BIGINT,
    approved_visits BIGINT,
    completed_visits BIGINT,
    denied_visits BIGINT,
    cancelled_visits BIGINT,
    unique_visitors BIGINT,
    avg_visit_duration INTERVAL
)
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF NOT (is_admin(current_user_id) OR is_guard(current_user_id)) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_visits,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_visits,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT AS approved_visits,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_visits,
        COUNT(*) FILTER (WHERE status = 'denied')::BIGINT AS denied_visits,
        COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled_visits,
        COUNT(DISTINCT visitor_id)::BIGINT AS unique_visitors,
        AVG(check_out_time - check_in_time) FILTER (
            WHERE check_out_time IS NOT NULL 
            AND check_in_time IS NOT NULL
        ) AS avg_visit_duration
    FROM visits
    WHERE
        (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. GET MY PENDING VISITS
-- =====================================================

CREATE FUNCTION get_my_pending_visits()
RETURNS TABLE (
    id uuid,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_company TEXT,
    purpose TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_host_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    SELECT h.id INTO user_host_id
    FROM hosts h
    WHERE h.auth_id = current_user_id AND h.active = true;
    
    IF user_host_id IS NULL THEN
        RAISE EXCEPTION 'Host record not found';
    END IF;
    
    RETURN QUERY
    SELECT
        v.id,
        vi.name AS visitor_name,
        vi.email AS visitor_email,
        vi.phone AS visitor_phone,
        vi.company AS visitor_company,
        v.purpose,
        v.created_at
    FROM visits v
    JOIN visitors vi ON v.visitor_id = vi.id
    WHERE
        v.host_id = user_host_id
        AND v.status = 'pending'
    ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. EXPORT VISITS
-- =====================================================

CREATE FUNCTION export_visits(
    p_search_term TEXT DEFAULT NULL,
    p_date_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_company TEXT,
    purpose TEXT,
    host_name TEXT,
    host_email TEXT,
    department_name TEXT,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status visit_status,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    IF NOT (is_admin(current_user_id) OR is_guard(current_user_id)) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    RETURN QUERY
    SELECT
        v.id,
        vi.name AS visitor_name,
        vi.email AS visitor_email,
        vi.phone AS visitor_phone,
        vi.company AS visitor_company,
        v.purpose,
        h.name AS host_name,
        h.email AS host_email,
        d.name AS department_name,
        v.check_in_time AS check_in,
        v.check_out_time AS check_out,
        v.status,
        v.approved_at,
        v.created_at
    FROM visits v
    LEFT JOIN visitors vi ON v.visitor_id = vi.id
    LEFT JOIN hosts h ON v.host_id = h.id
    LEFT JOIN departments d ON h.department_id = d.id
    WHERE
        (p_search_term IS NULL OR p_search_term = '' OR
         vi.name ILIKE ('%' || p_search_term || '%') OR
         h.name ILIKE ('%' || p_search_term || '%') OR
         vi.company ILIKE ('%' || p_search_term || '%'))
        AND (p_date_filter IS NULL OR p_date_filter = '' OR
             (v.check_in_time AT TIME ZONE 'Asia/Kolkata')::date = to_date(p_date_filter, 'YYYY-MM-DD') OR
             (v.created_at AT TIME ZONE 'Asia/Kolkata')::date = to_date(p_date_filter, 'YYYY-MM-DD'))
    ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GET ANALYTICS
-- =====================================================

CREATE FUNCTION get_analytics(
    p_date_range INT DEFAULT 7,
    p_department_id UUID DEFAULT NULL,
    p_status visit_status DEFAULT NULL
)
RETURNS TABLE (
    total_visits BIGINT,
    total_visitors BIGINT,
    avg_visit_duration INTERVAL,
    approval_rate NUMERIC,
    denial_rate NUMERIC,
    today_visits BIGINT,
    week_visits BIGINT,
    month_visits BIGINT,
    top_purposes JSONB,
    daily_stats JSONB
)
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    start_date TIMESTAMPTZ;
    end_date TIMESTAMPTZ;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    IF NOT (is_admin(current_user_id) OR is_guard(current_user_id)) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    end_date := NOW();
    start_date := end_date - (p_date_range || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH visits_in_range AS (
        SELECT
            v.id,
            v.visitor_id,
            v.status,
            v.check_in_time,
            v.check_out_time,
            v.created_at,
            v.purpose
        FROM visits v
        LEFT JOIN hosts h ON v.host_id = h.id
        WHERE
            v.created_at BETWEEN start_date AND end_date
            AND (p_department_id IS NULL OR h.department_id = p_department_id)
            AND (p_status IS NULL OR v.status = p_status)
    ),
    daily_counts AS (
        SELECT
            DATE(created_at AT TIME ZONE 'Asia/Kolkata') as visit_date,
            COUNT(id) as count
        FROM visits_in_range
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
    )
    SELECT
        (SELECT COUNT(id) FROM visits_in_range)::BIGINT,
        (SELECT COUNT(DISTINCT visitor_id) FROM visits_in_range)::BIGINT,
        (SELECT AVG(check_out_time - check_in_time) 
         FROM visits_in_range 
         WHERE status = 'completed')::INTERVAL,
        COALESCE(
            (SELECT (COUNT(id) FILTER (WHERE status IN ('approved', 'completed'))::NUMERIC / 
                     NULLIF(COUNT(id), 0)) * 100
             FROM visits_in_range 
             WHERE status IN ('approved', 'denied', 'completed', 'cancelled')),
            0
        ),
        COALESCE(
            (SELECT (COUNT(id) FILTER (WHERE status = 'denied')::NUMERIC / 
                     NULLIF(COUNT(id), 0)) * 100
             FROM visits_in_range 
             WHERE status IN ('approved', 'denied', 'completed', 'cancelled')),
            0
        ),
        (SELECT COUNT(id) FROM visits_in_range 
         WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)::BIGINT,
        (SELECT COUNT(id) FROM visits_in_range 
         WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT,
        (SELECT COUNT(id) FROM visits_in_range 
         WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT,
        (
            SELECT COALESCE(
                jsonb_agg(jsonb_build_object('purpose', purpose, 'count', count)),
                '[]'::jsonb
            )
            FROM (
                SELECT purpose, COUNT(id) as count
                FROM visits_in_range
                WHERE purpose IS NOT NULL AND purpose != ''
                GROUP BY purpose
                ORDER BY count DESC
                LIMIT 5
            ) top_purposes_sub
        ),
        (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'date', TO_CHAR(date_series AT TIME ZONE 'Asia/Kolkata', 'Mon DD'),
                        'count', COALESCE(daily_counts.count, 0)
                    )
                    ORDER BY date_series ASC
                ),
                '[]'::jsonb
            )
            FROM generate_series(
                start_date::date,
                end_date::date,
                '1 day'::interval
            ) AS date_series
            LEFT JOIN daily_counts ON (date_series AT TIME ZONE 'Asia/Kolkata')::date = daily_counts.visit_date
        );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION get_visits TO authenticated;
GRANT EXECUTE ON FUNCTION get_visitor_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_pending_visits TO authenticated;
GRANT EXECUTE ON FUNCTION export_visits TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_guard TO authenticated;
GRANT EXECUTE ON FUNCTION is_host TO authenticated;
GRANT EXECUTE ON FUNCTION to_ist_string TO authenticated;
GRANT EXECUTE ON FUNCTION to_ist_date TO authenticated;
GRANT EXECUTE ON FUNCTION to_ist_time TO authenticated;

-- Grant to anon for public visitor registration
GRANT EXECUTE ON FUNCTION is_admin TO anon;
GRANT EXECUTE ON FUNCTION is_guard TO anon;
GRANT EXECUTE ON FUNCTION is_host TO anon;

-- =====================================================
-- AUTO-CREATE HOST ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_public_host_on_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.hosts (
        auth_id,
        name,
        email,
        role,
        active,
        department_id
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        'host',
        true,
        (NEW.raw_user_meta_data->>'department_id')::uuid
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle case where host already exists
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Failed to create host record: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_public_host_on_signup();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE departments IS 'Organizational departments/units';
COMMENT ON TABLE hosts IS 'Users who can receive visitors (staff/employees)';
COMMENT ON TABLE visitors IS 'External visitors to the organization';
COMMENT ON TABLE visits IS 'Visit records linking visitors to hosts';

COMMENT ON COLUMN visits.status IS 'Visit lifecycle: pending → approved/denied → checked-in → completed';
COMMENT ON COLUMN hosts.role IS 'admin: full access, guard: security, host: regular staff';

COMMENT ON DATABASE postgres IS 'Timezone set to Asia/Kolkata (IST) for visitor management system';

-- =====================================================
-- END OF SCHEMA
-- =====================================================

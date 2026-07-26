-- Expand the permission set to cover every existing router, so
-- require_permission() can be wired into currently-live routes without
-- narrowing what any role can already do today.
--
-- Today's gate (get_clinician_context) treats CLINICIAN/SUPERVISOR/ADMIN as
-- interchangeable for patients/sessions/appointments/homework/careplans/
-- dashboard/ai. This migration grants all three roles the matching new
-- permission keys, so wiring require_permission() in is purely additive
-- (no live behavior regresses). Only admin_content.manage stays admin-only,
-- matching the existing manual _require_admin() check in admin_db_wired.py.

BEGIN;

INSERT INTO permissions (key, description) VALUES
    ('sessions.view', 'View session notes'),
    ('sessions.manage', 'Create and edit session notes'),
    ('appointments.view', 'View appointments'),
    ('appointments.manage', 'Create and update appointments'),
    ('homework.view', 'View homework assignments'),
    ('homework.manage', 'Assign homework and record clinician feedback'),
    ('careplans.view', 'View care plans'),
    ('careplans.manage', 'Create care plans'),
    ('dashboard.view', 'View the practice dashboard summary'),
    ('admin_content.manage', 'Manage resources, contacts, and assessment question banks'),
    ('ai.use', 'Generate AI clinical synthesis reports')
ON CONFLICT (key) DO NOTHING;

-- Clinicians could already create patients via get_clinician_context;
-- grant patients.manage so that stays true once require_permission is wired in.
INSERT INTO role_permissions (role, permission_key)
VALUES ('clinician', 'patients.manage')
ON CONFLICT DO NOTHING;

-- All three staff roles get the new view/manage pairs, matching today's
-- blanket "any non-patient role" gate on these routers.
INSERT INTO role_permissions (role, permission_key)
SELECT r, p
FROM unnest(ARRAY['admin', 'supervisor', 'clinician']) AS r
CROSS JOIN unnest(ARRAY[
    'sessions.view', 'sessions.manage',
    'appointments.view', 'appointments.manage',
    'homework.view', 'homework.manage',
    'careplans.view', 'careplans.manage',
    'dashboard.view',
    'ai.use'
]) AS p
ON CONFLICT DO NOTHING;

-- admin_content.manage matches the existing admin-only _require_admin() check.
INSERT INTO role_permissions (role, permission_key)
VALUES ('admin', 'admin_content.manage')
ON CONFLICT DO NOTHING;

COMMIT;
